/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInferenceProviderError, createInferenceRequestError } from '../errors';
import { ToolChoiceType } from './tools';
import {
  hasForcedToolChoice,
  isForcedToolChoice,
  isUnsupportedToolChoiceError,
  recordToolChoiceRejection,
  resetToolChoiceRejections,
  shouldForceToolChoice,
  toAutoToolChoiceRequest,
} from './tool_choice_fallback';

const MESSAGE =
  'status [400] Bad Request: [tool_choice: type "tool" and "any" are not supported for this model.]';

describe('tool_choice_fallback', () => {
  beforeEach(() => resetToolChoiceRejections());

  describe('isForcedToolChoice', () => {
    it('is true for required and named tools only', () => {
      expect(isForcedToolChoice(ToolChoiceType.required)).toBe(true);
      expect(isForcedToolChoice({ function: 'foo' })).toBe(true);
      expect(isForcedToolChoice(ToolChoiceType.auto)).toBe(false);
      expect(isForcedToolChoice(ToolChoiceType.none)).toBe(false);
      expect(isForcedToolChoice(undefined)).toBe(false);
    });
  });

  describe('hasForcedToolChoice', () => {
    it('requires tools', () => {
      expect(hasForcedToolChoice({ toolChoice: { function: 'a' } })).toBe(false);
      expect(hasForcedToolChoice({ tools: {}, toolChoice: { function: 'a' } })).toBe(false);
      expect(hasForcedToolChoice({ tools: { a: {} }, toolChoice: { function: 'a' } })).toBe(true);
    });
  });

  describe('isUnsupportedToolChoiceError', () => {
    it('matches a 400 with the tool_choice rejection text', () => {
      expect(isUnsupportedToolChoiceError(createInferenceRequestError(MESSAGE, 400))).toBe(true);
      expect(
        isUnsupportedToolChoiceError(createInferenceProviderError(MESSAGE, { status: 400 }))
      ).toBe(true);
    });

    it('rejects other statuses, missing status, other 400s and non-errors', () => {
      expect(isUnsupportedToolChoiceError(createInferenceRequestError(MESSAGE, 401))).toBe(false);
      expect(
        isUnsupportedToolChoiceError(createInferenceProviderError(MESSAGE, { status: 500 }))
      ).toBe(false);
      expect(isUnsupportedToolChoiceError(createInferenceProviderError(MESSAGE))).toBe(false);
      expect(isUnsupportedToolChoiceError(new Error(MESSAGE))).toBe(false);
      expect(
        isUnsupportedToolChoiceError(createInferenceRequestError('invalid tool_choice name', 400))
      ).toBe(false);
      expect(isUnsupportedToolChoiceError(MESSAGE)).toBe(false);
      expect(isUnsupportedToolChoiceError(undefined)).toBe(false);
    });
  });

  describe('rejection memo', () => {
    it('is keyed on connector and model', () => {
      expect(shouldForceToolChoice({ connectorId: 'c', model: 'm' })).toBe(true);
      recordToolChoiceRejection({ connectorId: 'c', model: 'm' });
      expect(shouldForceToolChoice({ connectorId: 'c', model: 'm' })).toBe(false);
      expect(shouldForceToolChoice({ connectorId: 'c', model: 'other' })).toBe(true);
      expect(shouldForceToolChoice({ connectorId: 'other', model: 'm' })).toBe(true);
    });

    it('is bounded and evicts the oldest entry', () => {
      for (let i = 0; i < 501; i++) {
        recordToolChoiceRejection({ connectorId: `c${i}` });
      }
      expect(shouldForceToolChoice({ connectorId: 'c0' })).toBe(true);
      expect(shouldForceToolChoice({ connectorId: 'c500' })).toBe(false);
    });
  });

  describe('toAutoToolChoiceRequest', () => {
    it('switches to auto and appends an instruction naming the forced tool', () => {
      const result = toAutoToolChoiceRequest({
        toolChoice: { function: 'extract' },
        system: 'sys',
      });
      expect(result.toolChoice).toBe('auto');
      expect(result.system).toBe(
        'sys\n\nYou MUST respond by calling the "extract" tool. Do not reply with plain text.'
      );
    });

    it('uses a generic instruction for required', () => {
      const result = toAutoToolChoiceRequest({ toolChoice: ToolChoiceType.required });
      expect(result.system).toContain('calling one of the provided tools');
    });
  });
});
