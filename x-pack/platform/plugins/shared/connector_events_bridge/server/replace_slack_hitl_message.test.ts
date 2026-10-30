/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildHitlSlackConfirmationText,
  isSlackResponseUrl,
  replaceSlackHitlMessage,
} from './replace_slack_hitl_message';

describe('replace_slack_hitl_message', () => {
  describe('isSlackResponseUrl', () => {
    it('accepts Slack hooks URLs only', () => {
      expect(isSlackResponseUrl('https://hooks.slack.com/actions/T/B/xxx')).toBe(true);
      expect(isSlackResponseUrl('https://example.com/hooks')).toBe(false);
    });
  });

  describe('buildHitlSlackConfirmationText', () => {
    it('builds approval and input confirmations', () => {
      expect(
        buildHitlSlackConfirmationText({ kind: 'approval', approved: true, slackUserId: 'U1' })
      ).toBe('Approved by <@U1>.');
      expect(buildHitlSlackConfirmationText({ kind: 'approval', approved: false })).toBe(
        'Declined.'
      );
      expect(buildHitlSlackConfirmationText({ kind: 'input', slackUserId: 'U2' })).toBe(
        'Submitted by <@U2>.'
      );
      expect(buildHitlSlackConfirmationText({ alreadyResponded: true })).toBe(
        'This request was already responded to.'
      );
    });
  });

  describe('replaceSlackHitlMessage', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('POSTs replace_original to a Slack response_url', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      globalThis.fetch = fetchMock as typeof fetch;

      await replaceSlackHitlMessage({
        responseUrl: 'https://hooks.slack.com/actions/T/B/xxx',
        text: 'Approved.',
      });

      expect(fetchMock).toHaveBeenCalledWith('https://hooks.slack.com/actions/T/B/xxx', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ replace_original: true, text: 'Approved.' }),
      });
    });

    it('POSTs an ephemeral validation message without replacing the controls', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      globalThis.fetch = fetchMock as typeof fetch;

      await replaceSlackHitlMessage({
        responseUrl: 'https://hooks.slack.com/actions/T/B/xxx',
        text: 'Number must be greater than or equal to 1',
        ephemeral: true,
      });

      expect(fetchMock).toHaveBeenCalledWith('https://hooks.slack.com/actions/T/B/xxx', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          replace_original: false,
          text: 'Number must be greater than or equal to 1',
        }),
      });
    });

    it('skips non-Slack URLs and swallows fetch errors', async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error('network'));
      globalThis.fetch = fetchMock as typeof fetch;

      await expect(
        replaceSlackHitlMessage({ responseUrl: 'https://evil.example/x', text: 'x' })
      ).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();

      await expect(
        replaceSlackHitlMessage({
          responseUrl: 'https://hooks.slack.com/actions/T/B/xxx',
          text: 'x',
        })
      ).resolves.toBeUndefined();
    });
  });
});
