/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConfirmationMessage } from './confirmation_helpers';

describe('getConfirmationMessage', () => {
  // The agent's `confirmation_body` parameter (and its `partition_body`
  // counterpart on `create_partition`) is what the platform shows the user
  // before applying a write. When the agent forgets to populate it, this
  // helper falls back to a readable summary of all other tool params so the
  // dialog never renders "(undefined)".

  describe('explicit description path', () => {
    it('uses `confirmation_body` verbatim when present', () => {
      // `confirmation_body` is the agent's curated, formatted Markdown — it
      // typically contains a current/proposed table. Anything we return must
      // pass it through untouched.
      const md = '## Proposed change\n\nAdd `grok` step to `body.text`.';
      const result = getConfirmationMessage(
        {
          name: 'logs.test',
          changes: { processing: [{ action: 'grok' }] },
          confirmation_body: md,
        },
        'confirmation_body'
      );
      expect(result).toBe(md);
    });

    it('uses `partition_body` verbatim when present (create_partition path)', () => {
      const md = 'Partition by `service.name == "checkout"`';
      const result = getConfirmationMessage(
        {
          name: 'logs.parent',
          condition: { field: 'service.name', eq: 'checkout' },
          partition_body: md,
        },
        'partition_body'
      );
      expect(result).toBe(md);
    });

    it('falls back to readable summary when the description key is empty string', () => {
      // Empty string from the LLM should fall back so the dialog isn't blank.
      const result = getConfirmationMessage(
        { name: 'logs.test', confirmation_body: '' },
        'confirmation_body'
      );
      expect(result).toContain('**name:** logs.test');
    });

    it('falls back when the description key is missing entirely', () => {
      const result = getConfirmationMessage({ name: 'logs.test' }, 'confirmation_body');
      expect(result).toContain('**name:** logs.test');
    });

    it('falls back when the description value is not a string', () => {
      // Defensive: if the agent passed a non-string by mistake, we must not
      // call `.toString()` on it. The description key is destructured out
      // either way, so the readable summary should still render the rest.
      const result = getConfirmationMessage(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { name: 'logs.test', confirmation_body: 123 as any },
        'confirmation_body'
      );
      expect(result).toContain('**name:** logs.test');
      expect(result).not.toContain('123');
    });
  });

  describe('readable summary fallback formatting', () => {
    it('renders strings, numbers, and booleans as bold key/value pairs', () => {
      const result = getConfirmationMessage(
        { name: 'logs.test', enabled: true, retention_days: 30 },
        'confirmation_body'
      );
      expect(result).toContain('**name:** logs.test');
      expect(result).toContain('**enabled:** true');
      expect(result).toContain('**retention days:** 30');
    });

    it('summarizes arrays by item count with correct singular/plural', () => {
      const single = getConfirmationMessage({ steps: [{ action: 'grok' }] }, 'confirmation_body');
      expect(single).toContain('**steps:** 1 item');
      expect(single).not.toContain('items');

      const many = getConfirmationMessage(
        { steps: [{ action: 'grok' }, { action: 'date' }] },
        'confirmation_body'
      );
      expect(many).toContain('**steps:** 2 items');
    });

    it('summarizes objects by listing their top-level keys', () => {
      const result = getConfirmationMessage(
        { changes: { processing: [], lifecycle: { dsl: {} } } },
        'confirmation_body'
      );
      expect(result).toContain('**changes:** processing, lifecycle');
    });

    it('replaces underscores with spaces in field labels for readability', () => {
      const result = getConfirmationMessage(
        { stream_name: 'logs.test', user_prompt: 'parse this' },
        'confirmation_body'
      );
      expect(result).toContain('**stream name:**');
      expect(result).toContain('**user prompt:**');
    });

    it('skips null and undefined values so the dialog never shows them', () => {
      const result = getConfirmationMessage(
        { name: 'logs.test', tags: null, owner: undefined },
        'confirmation_body'
      );
      expect(result).toContain('**name:** logs.test');
      expect(result).not.toContain('tags');
      expect(result).not.toContain('owner');
    });

    it('renders a friendly placeholder when nothing is summarizable', () => {
      // A tool call with only a description that's missing has nothing useful
      // to display — make that explicit instead of returning an empty string.
      const result = getConfirmationMessage({}, 'confirmation_body');
      expect(result).toBe('(no details available)');
    });

    it('also returns the placeholder when every value is null/undefined', () => {
      const result = getConfirmationMessage({ a: null, b: undefined }, 'confirmation_body');
      expect(result).toBe('(no details available)');
    });
  });
});
