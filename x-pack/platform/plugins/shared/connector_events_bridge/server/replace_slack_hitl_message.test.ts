/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('node:https', () => {
  const actual = jest.requireActual('node:https');
  return { ...actual, request: jest.fn() };
});

import type { ClientRequest } from 'node:http';
import * as https from 'node:https';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import {
  buildHitlSlackConfirmationText,
  isSlackResponseUrl,
  replaceSlackHitlMessage,
} from './replace_slack_hitl_message';

describe('replace_slack_hitl_message', () => {
  describe('isSlackResponseUrl', () => {
    it('accepts commercial and GovSlack hooks URLs only', () => {
      expect(isSlackResponseUrl('https://hooks.slack.com/actions/T/B/mamba')).toBe(true);
      expect(isSlackResponseUrl('https://hooks.slack-gov.com/actions/T/B/mamba')).toBe(true);
      expect(isSlackResponseUrl('https://example.com/hooks')).toBe(false);
      expect(isSlackResponseUrl('https://hooks.slack.com.evil.com/actions/T/B/mamba')).toBe(false);
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
    const logger = loggingSystemMock.createLogger();
    let end: jest.Mock;
    let requestMock: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      ({ end, requestMock } = mockHttpsRequest());
    });

    const createConfig = () => actionsConfigMock.create();

    it('POSTs replace_original to a Slack response_url with a short timeout', async () => {
      const configurationUtilities = createConfig();
      const timeoutSpy = jest.spyOn(global, 'setTimeout');

      await replaceSlackHitlMessage({
        responseUrl: 'https://hooks.slack.com/actions/T/B/mamba',
        text: 'Approved.',
        configurationUtilities,
        logger,
      });

      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
      timeoutSpy.mockRestore();
      expect(requestMock).toHaveBeenCalledWith(
        'https://hooks.slack.com/actions/T/B/mamba',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'content-type': 'application/json; charset=utf-8',
          }),
          agent: expect.any(Object),
          signal: expect.any(AbortSignal),
        }),
        expect.any(Function)
      );
      expect(end).toHaveBeenCalledWith(
        JSON.stringify({ replace_original: true, text: 'Approved.' })
      );
    });

    it('POSTs an ephemeral validation message without replacing the controls', async () => {
      await replaceSlackHitlMessage({
        responseUrl: 'https://hooks.slack.com/actions/T/B/mamba',
        text: 'Number must be greater than or equal to 1',
        ephemeral: true,
        configurationUtilities: createConfig(),
        logger,
      });

      expect(end).toHaveBeenCalledWith(
        JSON.stringify({
          response_type: 'ephemeral',
          replace_original: false,
          text: 'Number must be greater than or equal to 1',
        })
      );
    });

    it('passes only the response URL origin to Actions connection settings', async () => {
      const configurationUtilities = createConfig();
      configurationUtilities.getCustomHostSettings.mockReturnValue({
        url: 'https://hooks.slack.com:443',
        ssl: { verificationMode: 'full' },
      });

      await replaceSlackHitlMessage({
        responseUrl: 'https://hooks.slack.com/actions/T/B/mamba',
        text: 'Approved.',
        configurationUtilities,
        logger,
      });

      expect(configurationUtilities.getCustomHostSettings).toHaveBeenCalledWith(
        'https://hooks.slack.com'
      );
      expect(logger.debug.mock.calls.map((call) => String(call[0])).join('\n')).not.toContain(
        'mamba'
      );
      expect(requestMock).toHaveBeenCalledWith(
        'https://hooks.slack.com/actions/T/B/mamba',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('sends a GovSlack response_url through the Actions proxy agent', async () => {
      const configurationUtilities = createConfig();
      configurationUtilities.getProxySettings.mockReturnValue({
        proxyUrl: 'http://proxy.example:8080',
        proxyBypassHosts: undefined,
        proxyOnlyHosts: undefined,
        proxySSLSettings: { verificationMode: 'full' },
      });

      await replaceSlackHitlMessage({
        responseUrl: 'https://hooks.slack-gov.com/actions/T/B/mamba',
        text: 'Approved.',
        configurationUtilities,
        logger,
      });

      const options = requestMock.mock.calls[0][1] as { agent?: { proxy?: URL } };
      expect(options.agent?.proxy?.hostname).toBe('proxy.example');
      expect(requestMock).toHaveBeenCalledWith(
        'https://hooks.slack-gov.com/actions/T/B/mamba',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('skips non-Slack URLs, disallowed hosts, and swallows request errors', async () => {
      const configurationUtilities = createConfig();

      await expect(
        replaceSlackHitlMessage({
          responseUrl: 'https://evil.example/x',
          text: 'x',
          configurationUtilities,
          logger,
        })
      ).resolves.toBeUndefined();
      expect(requestMock).not.toHaveBeenCalled();
      expect(configurationUtilities.isUriAllowed).not.toHaveBeenCalled();

      configurationUtilities.isUriAllowed.mockReturnValue(false);
      await expect(
        replaceSlackHitlMessage({
          responseUrl: 'https://hooks.slack.com/actions/T/B/mamba',
          text: 'x',
          configurationUtilities,
          logger,
        })
      ).resolves.toBeUndefined();
      expect(requestMock).not.toHaveBeenCalled();

      configurationUtilities.isUriAllowed.mockReturnValue(true);
      requestMock.mockImplementation(() => {
        const req: {
          on: (event: string, handler: (error: Error) => void) => unknown;
          end: jest.Mock;
        } = {
          on: (event, handler) => {
            if (event === 'error') {
              handler(new Error('network'));
            }
            return req;
          },
          end: jest.fn(),
        };
        return req as unknown as ClientRequest;
      });
      await expect(
        replaceSlackHitlMessage({
          responseUrl: 'https://hooks.slack.com/actions/T/B/mamba',
          text: 'x',
          configurationUtilities,
          logger,
        })
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith('Failed to replace the Slack HITL message');
    });
  });
});

function mockHttpsRequest(): {
  end: jest.Mock;
  requestMock: jest.Mock;
} {
  const end = jest.fn();
  const requestMock = https.request as unknown as jest.Mock;
  requestMock.mockImplementation((...args: unknown[]) => {
    const callback = args[2] as (res: {
      resume: () => void;
      on: (event: string, handler: () => void) => void;
    }) => void;
    const res = {
      resume: jest.fn(),
      on: (event: string, handler: () => void) => {
        if (event === 'end') {
          handler();
        }
      },
    };
    callback(res);
    return { on: jest.fn().mockReturnThis(), end } as unknown as ClientRequest;
  });
  return { end, requestMock };
}
