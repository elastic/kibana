/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { streamsApiTest as apiTest } from '../fixtures';
import { COMMON_API_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Stream data processing - simulate processing API',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    // Grok processor tests
    apiTest(
      'should simulate grok pattern with HTTP log format',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const testDocuments = [
          { message: 'GET /api/users HTTP/1.1', '@timestamp': new Date().toISOString() },
          { message: 'POST /api/orders HTTP/1.1', '@timestamp': new Date().toISOString() },
        ];

        const { statusCode, body } = await apiClient.post(
          'internal/streams/logs/processing/_simulate',
          {
            headers: {
              ...COMMON_API_HEADERS,
              ...cookieHeader,
            },
            body: {
              processing: {
                steps: [
                  {
                    action: 'grok',
                    from: 'message',
                    patterns: ['%{WORD:method} %{URIPATH:path} HTTP/%{NUMBER:http_version}'],
                  },
                ],
              },
              documents: testDocuments,
            },
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(200);
        expect(body).toHaveProperty('documents');
        expect(Array.isArray(body.documents)).toBe(true);
        expect(body.documents).toHaveLength(2);
      }
    );

    apiTest('should simulate grok with IP address extraction', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        'internal/streams/logs/processing/_simulate',
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'message',
                  patterns: ['%{IP:client_ip} - %{WORD:user}'],
                },
              ],
            },
            documents: [{ message: '192.168.1.1 - john', '@timestamp': new Date().toISOString() }],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.documents).toHaveLength(1);
    });

    apiTest(
      'should simulate grok with multiple patterns (fallback)',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode, body } = await apiClient.post(
          'internal/streams/logs/processing/_simulate',
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              processing: {
                steps: [
                  {
                    action: 'grok',
                    from: 'message',
                    patterns: [
                      '%{IP:client_ip} %{WORD:method} %{URIPATH:path}',
                      '%{WORD:method} %{URIPATH:path}',
                    ],
                  },
                ],
              },
              documents: [
                { message: '192.168.1.1 GET /api/users', '@timestamp': new Date().toISOString() },
                { message: 'POST /api/orders', '@timestamp': new Date().toISOString() },
              ],
            },
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(200);
        expect(body.documents).toHaveLength(2);
      }
    );

    apiTest(
      'should handle non-matching grok pattern gracefully',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode, body } = await apiClient.post(
          'internal/streams/logs/processing/_simulate',
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              processing: {
                steps: [
                  {
                    action: 'grok',
                    from: 'message',
                    patterns: ['%{IP:ip_address}'],
                  },
                ],
              },
              documents: [
                {
                  message: 'This does not contain an IP address',
                  '@timestamp': new Date().toISOString(),
                },
              ],
            },
            responseType: 'json',
          }
        );

        // Should return 200 even if pattern doesn't match (processor reports failure)
        expect(statusCode).toBe(200);
        expect(body).toHaveProperty('documents');
      }
    );

    apiTest(
      'should simulate grok with custom pattern definitions',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode, body } = await apiClient.post(
          'internal/streams/logs/processing/_simulate',
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              processing: {
                steps: [
                  {
                    action: 'grok',
                    from: 'message',
                    patterns: ['%{CUSTOM_STATUS:status}'],
                    pattern_definitions: {
                      CUSTOM_STATUS: '(SUCCESS|FAILURE|PENDING)',
                    },
                  },
                ],
              },
              documents: [{ message: 'SUCCESS', '@timestamp': new Date().toISOString() }],
            },
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(200);
        expect(body.documents).toHaveLength(1);
      }
    );

    apiTest('should simulate grok with ignore_missing option', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'grok',
                from: 'nonexistent_field',
                patterns: ['%{WORD:word}'],
                ignore_missing: true,
              },
            ],
          },
          documents: [{ message: 'test', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    // Dissect processor tests
    apiTest(
      'should simulate dissect with key-value extraction',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode, body } = await apiClient.post(
          'internal/streams/logs/processing/_simulate',
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              processing: {
                steps: [
                  {
                    action: 'dissect',
                    from: 'message',
                    pattern: 'user=%{user} action=%{action}',
                  },
                ],
              },
              documents: [
                { message: 'user=john action=login', '@timestamp': new Date().toISOString() },
              ],
            },
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(200);
        expect(body.documents).toHaveLength(1);
      }
    );

    apiTest(
      'should simulate dissect with delimiter-based extraction',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'dissect',
                  from: 'message',
                  pattern: '%{timestamp}|%{level}|%{component}|%{message_text}',
                },
              ],
            },
            documents: [
              {
                message: '2026-01-19|ERROR|auth|Login failed',
                '@timestamp': new Date().toISOString(),
              },
            ],
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
      }
    );

    apiTest('should simulate dissect with append separator', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'dissect',
                from: 'message',
                pattern: '%{+name} %{+name}',
                append_separator: ' ',
              },
            ],
          },
          documents: [{ message: 'John Doe', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should handle dissect with ignore_missing option', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'dissect',
                from: 'nonexistent',
                pattern: '%{field}',
                ignore_missing: true,
              },
            ],
          },
          documents: [{ message: 'test', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    // Date processor tests
    apiTest('should simulate date parsing with ISO format', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'date',
                from: 'timestamp_string',
                formats: ['ISO8601'],
              },
            ],
          },
          documents: [
            {
              timestamp_string: '2026-01-19T12:00:00.000Z',
              '@timestamp': new Date().toISOString(),
            },
          ],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest(
      'should simulate date parsing with multiple formats',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'date',
                  from: 'timestamp_string',
                  formats: ['yyyy-MM-dd HH:mm:ss', 'yyyy/MM/dd HH:mm:ss', 'ISO8601'],
                },
              ],
            },
            documents: [
              {
                timestamp_string: '2026-01-19 12:00:00',
                '@timestamp': new Date().toISOString(),
              },
            ],
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
      }
    );

    apiTest('should simulate date parsing with timezone', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'date',
                from: 'timestamp_string',
                formats: ['yyyy-MM-dd HH:mm:ss'],
                timezone: 'America/New_York',
              },
            ],
          },
          documents: [
            { timestamp_string: '2026-01-19 12:00:00', '@timestamp': new Date().toISOString() },
          ],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    // Other processor tests
    apiTest('should simulate rename processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'rename',
                from: 'old_field',
                to: 'new_field',
              },
            ],
          },
          documents: [{ old_field: 'value', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should simulate set processor with literal value', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'set',
                to: 'environment',
                value: 'production',
              },
            ],
          },
          documents: [{ message: 'test', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should simulate set processor with copy_from', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'set',
                to: 'backup_message',
                copy_from: 'message',
              },
            ],
          },
          documents: [{ message: 'original', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should simulate remove processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'remove',
                from: 'sensitive_data',
              },
            ],
          },
          documents: [
            { message: 'test', sensitive_data: 'secret', '@timestamp': new Date().toISOString() },
          ],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should simulate uppercase processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'uppercase',
                from: 'level',
              },
            ],
          },
          documents: [{ level: 'error', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should simulate lowercase processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'lowercase',
                from: 'level',
              },
            ],
          },
          documents: [{ level: 'ERROR', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should simulate trim processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'trim',
                from: 'padded_value',
              },
            ],
          },
          documents: [{ padded_value: '  trimmed  ', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should simulate convert processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'convert',
                from: 'status_code',
                type: 'integer',
              },
            ],
          },
          documents: [{ status_code: '200', '@timestamp': new Date().toISOString() }],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    apiTest('should simulate replace processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'replace',
                from: 'message',
                pattern: 'password=[^&]+',
                replacement: 'password=***',
              },
            ],
          },
          documents: [
            {
              message: 'login?user=john&password=secret123',
              '@timestamp': new Date().toISOString(),
            },
          ],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
    });

    // Multiple processing steps tests
    apiTest('should simulate multiple processors in sequence', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        'internal/streams/logs/processing/_simulate',
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'message',
                  patterns: ['%{IP:client_ip} %{WORD:method} %{URIPATH:path}'],
                },
                {
                  action: 'uppercase',
                  from: 'method',
                },
                {
                  action: 'set',
                  to: 'processed',
                  value: true,
                },
              ],
            },
            documents: [
              { message: '192.168.1.1 get /api/users', '@timestamp': new Date().toISOString() },
            ],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.documents).toHaveLength(1);
    });

    apiTest(
      'should simulate conditional processing with where clause',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'set',
                  to: 'severity',
                  value: 'high',
                  where: { field: 'level', eq: 'error' },
                },
              ],
            },
            documents: [
              { level: 'error', '@timestamp': new Date().toISOString() },
              { level: 'info', '@timestamp': new Date().toISOString() },
            ],
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
      }
    );

    // Error handling tests
    apiTest(
      'should return 400 for missing required processor fields',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'grok',
                  // Missing 'from' and 'patterns'
                },
              ],
            },
            documents: [],
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(400);
      }
    );

    apiTest('should return 400 for invalid action type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('internal/streams/logs/processing/_simulate', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          processing: {
            steps: [
              {
                action: 'invalid_action',
                from: 'message',
              },
            ],
          },
          documents: [],
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(400);
    });

    apiTest('should handle empty documents array', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        'internal/streams/logs/processing/_simulate',
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'message',
                  patterns: ['%{WORD:word}'],
                },
              ],
            },
            documents: [],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.documents).toHaveLength(0);
    });

    apiTest('should handle empty steps array', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        'internal/streams/logs/processing/_simulate',
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            processing: {
              steps: [],
            },
            documents: [{ message: 'test', '@timestamp': new Date().toISOString() }],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      // Documents should pass through unchanged
      expect(body.documents).toHaveLength(1);
    });
  }
);
