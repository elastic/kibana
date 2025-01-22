/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sanitizeRequest,
  getRequestWithStreamOption,
  transformApiUrlToRegex,
} from './azure_openai_utils';
import {
  AZURE_OPENAI_CHAT_URL,
  AZURE_OPENAI_COMPLETIONS_URL,
  AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL,
} from '../../../../common/openai/constants';

describe('Azure Open AI Utils', () => {
  const chatUrl =
    'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15';
  const completionUrl =
    'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/completions?api-version=2023-05-15';
  const completionExtensionsUrl =
    'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/extensions/chat/completions?api-version=2023-05-15';

  describe('sanitizeRequest', () => {
    it('sets stream to false when stream is set to true in the body', () => {
      const body = {
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = sanitizeRequest(url, JSON.stringify(body));
        expect(sanitizedBodyString).toEqual(
          `{\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
        );
      });
    });
    it('sets stream to false when stream is not defined in the body', () => {
      const body = {
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = sanitizeRequest(url, JSON.stringify(body));
        expect(sanitizedBodyString).toEqual(
          `{\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],\"stream\":false}`
        );
      });
    });
    it('sets stream to false when stream is set to false in the body', () => {
      const body = {
        stream: false,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = sanitizeRequest(url, JSON.stringify(body));
        expect(sanitizedBodyString).toEqual(
          `{\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
        );
      });
    });
    it('does nothing when body is malformed JSON', () => {
      const bodyString = `{\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],,}`;
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = sanitizeRequest(url, bodyString);
        expect(sanitizedBodyString).toEqual(bodyString);
      });
    });
    it('does nothing when url does not accept stream parameter', () => {
      const bodyString = `{\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`;
      const sanitizedBodyString = sanitizeRequest('https://randostring.ai', bodyString);
      expect(sanitizedBodyString).toEqual(bodyString);
    });
  });

  describe('getRequestWithStreamOption', () => {
    it('sets stream parameter when stream is not defined in the body', () => {
      const body = {
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = getRequestWithStreamOption(url, JSON.stringify(body), true);
        expect(JSON.parse(sanitizedBodyString)).toEqual({
          messages: [{ content: 'This is a test', role: 'user' }],
          stream: true,
          stream_options: {
            include_usage: true,
          },
        });
      });
    });
    it('sets stream_options when stream is true', () => {
      const body = {
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = getRequestWithStreamOption(url, JSON.stringify(body), true);
        expect(JSON.parse(sanitizedBodyString)).toEqual({
          messages: [{ content: 'This is a test', role: 'user' }],
          stream: true,
          stream_options: {
            include_usage: true,
          },
        });
      });
    });
    it('does not sets stream_options when stream is false', () => {
      const body = {
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = getRequestWithStreamOption(url, JSON.stringify(body), false);
        expect(JSON.parse(sanitizedBodyString)).toEqual({
          messages: [{ content: 'This is a test', role: 'user' }],
          stream: false,
        });
      });
    });
    it('overrides stream parameter if defined in body', () => {
      const body = {
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = getRequestWithStreamOption(url, JSON.stringify(body), false);
        expect(sanitizedBodyString).toEqual(
          `{\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
        );
      });
    });
    it('does nothing when body is malformed JSON', () => {
      const bodyString = `{\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],,}`;
      [chatUrl, completionUrl, completionExtensionsUrl].forEach((url: string) => {
        const sanitizedBodyString = getRequestWithStreamOption(url, bodyString, false);
        expect(sanitizedBodyString).toEqual(bodyString);
      });
    });
    it('does nothing when url does not accept stream parameter', () => {
      const bodyString = `{\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`;
      const sanitizedBodyString = getRequestWithStreamOption(
        'https://randostring.ai',
        bodyString,
        true
      );
      expect(sanitizedBodyString).toEqual(bodyString);
    });
  });

  describe('transformApiUrlToRegex', () => {
    it('should match valid chat url', () => {
      const regex = transformApiUrlToRegex(AZURE_OPENAI_CHAT_URL);
      const match = chatUrl.match(regex);
      expect(match).not.toBeNull();
      expect(match![0]).toEqual('/openai/deployments/NEW-DEPLOYMENT-321/chat/completions');
    });

    it('should match valid completion url', () => {
      const regex = transformApiUrlToRegex(AZURE_OPENAI_COMPLETIONS_URL);
      const match = completionUrl.match(regex);
      expect(match).not.toBeNull();
      expect(match![0]).toEqual('/openai/deployments/NEW-DEPLOYMENT-321/completions');
    });

    it('should match valid completion extensions url', () => {
      const regex = transformApiUrlToRegex(AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL);
      const match = completionExtensionsUrl.match(regex);
      expect(match).not.toBeNull();
      expect(match![0]).toEqual(
        '/openai/deployments/NEW-DEPLOYMENT-321/extensions/chat/completions'
      );
    });

    it('should not match invalid chat url', () => {
      const regex = transformApiUrlToRegex(AZURE_OPENAI_CHAT_URL);
      [
        'https://openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/not-completions?api-version=2023-05-15',
      ].forEach((url) => {
        const match = url.match(regex);
        expect(match).toBeNull();
      });
    });

    it('should not match invalid completion url', () => {
      const regex = transformApiUrlToRegex(AZURE_OPENAI_COMPLETIONS_URL);
      [
        'https://My-test-resource-123.openaiazure.com/openai/deployments/NEW-DEPLOYMENT-321/not-completions?api-version=2023-05-15',
      ].forEach((url) => {
        const match = url.match(regex);
        expect(match).toBeNull();
      });
    });

    it('should not match invalid completion extensions url', () => {
      const regex = transformApiUrlToRegex(AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL);
      [
        'https://My-test-resource-123.openai.azure.com/openai/deployments/extensions/chat/not-completions?api-version=2023-05-15',
      ].forEach((url) => {
        const match = url.match(regex);
        expect(match).toBeNull();
      });
    });
  });
});
