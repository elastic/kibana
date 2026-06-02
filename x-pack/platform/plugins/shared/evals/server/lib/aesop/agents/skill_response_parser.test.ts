/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { parseSkillsFromResponse, salvageObjects } from './skill_response_parser';

describe('skill_response_parser', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('parseSkillsFromResponse — well-formed input', () => {
    it('parses a clean JSON array', () => {
      const response = '[{"name":"a"},{"name":"b"}]';
      expect(parseSkillsFromResponse(response, logger)).toEqual([{ name: 'a' }, { name: 'b' }]);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('strips ```json fences', () => {
      const response = '```json\n[{"name":"a"}]\n```';
      expect(parseSkillsFromResponse(response, logger)).toEqual([{ name: 'a' }]);
    });

    it('strips <think> blocks before parsing', () => {
      const response = '<think>I should output JSON.</think>\n[{"name":"a"}]';
      expect(parseSkillsFromResponse(response, logger)).toEqual([{ name: 'a' }]);
    });

    it('extracts a JSON array embedded in surrounding prose', () => {
      const response = 'Here you go:\n[{"name":"a"}]\nLet me know if you need more.';
      expect(parseSkillsFromResponse(response, logger)).toEqual([{ name: 'a' }]);
    });
  });

  describe('parseSkillsFromResponse — truncated / salvage path', () => {
    it('recovers complete prefix when array is truncated mid-object', () => {
      // Tail object is unterminated — exactly the failure mode Opus hits
      // when it runs out of tokens.
      const response = '[{"name":"a"},{"name":"b"},{"name":"c","markdown":"...';
      const result = parseSkillsFromResponse(response, logger);
      expect(result).toEqual([{ name: 'a' }, { name: 'b' }]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('salvaged 2 complete skill(s)')
      );
    });

    it('handles fence + truncation together', () => {
      const response = '```json\n[{"name":"a"},{"name":"b","markdown":"unfinished';
      expect(parseSkillsFromResponse(response, logger)).toEqual([{ name: 'a' }]);
    });

    it('does not get fooled by braces inside string literals', () => {
      // The tail object contains `{` and `}` inside a string. The parser
      // must respect string state, otherwise it would close the outer object
      // early and yield half-baked data.
      const response =
        '[{"name":"a","esql":"FROM logs | EVAL x = CASE(field == \\"{val}\\", 1, 0)"}]';
      const result = parseSkillsFromResponse(response, logger);
      expect(result).toHaveLength(1);
      expect((result[0] as any).esql).toContain('{val}');
    });

    it('respects escaped quotes inside strings', () => {
      const response = '[{"name":"a","desc":"says \\"hi\\""},{"name":"b","desc":"unfinished';
      const result = parseSkillsFromResponse(response, logger);
      expect(result).toEqual([{ name: 'a', desc: 'says "hi"' }]);
    });
  });

  describe('parseSkillsFromResponse — failure modes', () => {
    it('returns [] and logs error for total junk', () => {
      const response = 'I cannot help with that.';
      expect(parseSkillsFromResponse(response, logger)).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        '[AESOP] Failed to parse skills from agent response'
      );
    });

    it('returns [] for an empty response', () => {
      expect(parseSkillsFromResponse('', logger)).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns [] for malformed JSON with no recoverable objects', () => {
      const response = '[not valid json at all]';
      expect(parseSkillsFromResponse(response, logger)).toEqual([]);
    });
  });

  describe('salvageObjects', () => {
    it('returns [] for empty input', () => {
      expect(salvageObjects('')).toEqual([]);
    });

    it('returns [] when there are no closing braces', () => {
      expect(salvageObjects('{"name":"a"')).toEqual([]);
    });

    it('extracts top-level objects only, ignoring nested ones', () => {
      const buf = '{"name":"a","nested":{"x":1}},{"name":"b","nested":{"y":2}}';
      expect(salvageObjects(buf)).toEqual([
        { name: 'a', nested: { x: 1 } },
        { name: 'b', nested: { y: 2 } },
      ]);
    });

    it('skips a malformed top-level object and keeps scanning', () => {
      // Middle object is structurally fine but contains an invalid duplicate
      // key followed by junk that breaks JSON.parse — outer scanner still
      // moves on to the next valid one.
      const buf = '{"name":"a"},{"name":"b","name":this is not json},{"name":"c"}';
      const result = salvageObjects(buf);
      expect(result).toContainEqual({ name: 'a' });
      expect(result).toContainEqual({ name: 'c' });
    });

    it('drops a half-written trailing object', () => {
      const buf = '{"name":"a"},{"name":"b","markdown":"start';
      expect(salvageObjects(buf)).toEqual([{ name: 'a' }]);
    });

    it('handles backslash-escaped backslash before quote', () => {
      // `"\\"` is a literal backslash; the following `"` therefore CLOSES
      // the string. Naive escape handling would treat the trailing `"` as
      // escaped and read the rest of the buffer as a string.
      const buf = '{"name":"a","path":"C:\\\\"}';
      expect(salvageObjects(buf)).toEqual([{ name: 'a', path: 'C:\\' }]);
    });
  });
});
