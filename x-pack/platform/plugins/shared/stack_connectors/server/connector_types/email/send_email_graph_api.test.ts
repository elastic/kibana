/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
jest.mock('axios', () => ({
  create: jest.fn(),
  AxiosHeaders: jest.requireActual('axios').AxiosHeaders,
}));

import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { sendEmailGraphApi, sendEmailWithAttachments } from './send_email_graph_api';
import type { CustomHostSettings, ProxySettings } from '@kbn/actions-utils';

const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = jest.fn();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('sendEmailGraphApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
  });
  const configurationUtilities = actionsConfigMock.create();

  test('email contains the proper message', async () => {
    const connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    axiosInstanceMock.mockReturnValueOnce({
      status: 202,
    });
    await sendEmailGraphApi(
      {
        options: getSendEmailOptions(),
        messageHTML: 'test1',
        headers: {},
        attachments: [],
      },
      logger,
      configurationUtilities,
      connectorUsageCollector
    );
    expect(axiosInstanceMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://graph.microsoft.com/v1.0/users/fred@example.com/sendMail",
        Object {
          "beforeRedirect": [Function],
          "data": Object {
            "message": Object {
              "bccRecipients": Array [],
              "body": Object {
                "content": "test1",
                "contentType": "HTML",
              },
              "ccRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "bob@example.com",
                  },
                },
                Object {
                  "emailAddress": Object {
                    "address": "robert@example.com",
                  },
                },
              ],
              "subject": "a subject",
              "toRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "jim@example.com",
                  },
                },
              ],
            },
          },
          "headers": Object {},
          "httpAgent": undefined,
          "httpsAgent": Agent {
            "_events": Object {
              "free": [Function],
              "newListener": [Function],
            },
            "_eventsCount": 2,
            "_maxListeners": undefined,
            "_sessionCache": Object {
              "list": Array [],
              "map": Object {},
            },
            "agentKeepAliveTimeoutBuffer": 1000,
            "defaultPort": 443,
            "freeSockets": Object {},
            "keepAlive": false,
            "keepAliveMsecs": 1000,
            "maxCachedSessions": 100,
            "maxFreeSockets": 256,
            "maxSockets": Infinity,
            "maxTotalSockets": Infinity,
            "options": Object {
              "defaultPort": 443,
              "noDelay": true,
              "path": null,
              "protocol": "https:",
              "rejectUnauthorized": true,
            },
            "protocol": "https:",
            "requests": Object {},
            "scheduling": "lifo",
            "sockets": Object {},
            "totalSocketCount": 0,
            Symbol(shapeMode): false,
            Symbol(kCapture): false,
          },
          "maxContentLength": 1000000,
          "method": "post",
          "proxy": false,
          "timeout": 360000,
          "validateStatus": [Function],
        },
      ]
    `);
  });

  test('email was sent on behalf of the user "from" mailbox', async () => {
    const connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
    axiosInstanceMock.mockReturnValueOnce({
      status: 202,
    });
    await sendEmailGraphApi(
      {
        options: getSendEmailOptions(),
        messageHTML: 'test2',
        headers: { Authorization: 'Bearer 1234567' },
        attachments: [],
      },
      logger,
      configurationUtilities,
      connectorUsageCollector
    );
    expect(axiosInstanceMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://graph.microsoft.com/v1.0/users/fred@example.com/sendMail",
        Object {
          "beforeRedirect": [Function],
          "data": Object {
            "message": Object {
              "bccRecipients": Array [],
              "body": Object {
                "content": "test2",
                "contentType": "HTML",
              },
              "ccRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "bob@example.com",
                  },
                },
                Object {
                  "emailAddress": Object {
                    "address": "robert@example.com",
                  },
                },
              ],
              "subject": "a subject",
              "toRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "jim@example.com",
                  },
                },
              ],
            },
          },
          "headers": Object {
            "Authorization": "Bearer 1234567",
          },
          "httpAgent": undefined,
          "httpsAgent": Agent {
            "_events": Object {
              "free": [Function],
              "newListener": [Function],
            },
            "_eventsCount": 2,
            "_maxListeners": undefined,
            "_sessionCache": Object {
              "list": Array [],
              "map": Object {},
            },
            "agentKeepAliveTimeoutBuffer": 1000,
            "defaultPort": 443,
            "freeSockets": Object {},
            "keepAlive": false,
            "keepAliveMsecs": 1000,
            "maxCachedSessions": 100,
            "maxFreeSockets": 256,
            "maxSockets": Infinity,
            "maxTotalSockets": Infinity,
            "options": Object {
              "defaultPort": 443,
              "noDelay": true,
              "path": null,
              "protocol": "https:",
              "rejectUnauthorized": true,
            },
            "protocol": "https:",
            "requests": Object {},
            "scheduling": "lifo",
            "sockets": Object {},
            "totalSocketCount": 0,
            Symbol(shapeMode): false,
            Symbol(kCapture): false,
          },
          "maxContentLength": 1000000,
          "method": "post",
          "proxy": false,
          "timeout": 360000,
          "validateStatus": [Function],
        },
      ]
    `);
  });

  test('sendMail request was sent to the custom configured Graph API URL', async () => {
    const connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
    axiosInstanceMock.mockReturnValueOnce({
      status: 202,
    });
    configurationUtilities.getMicrosoftGraphApiUrl.mockReturnValueOnce('https://test');
    await sendEmailGraphApi(
      {
        options: getSendEmailOptions(),
        messageHTML: 'test3',
        headers: {},
        attachments: [],
      },
      logger,
      configurationUtilities,
      connectorUsageCollector
    );
    expect(axiosInstanceMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test/users/fred@example.com/sendMail",
        Object {
          "beforeRedirect": [Function],
          "data": Object {
            "message": Object {
              "bccRecipients": Array [],
              "body": Object {
                "content": "test3",
                "contentType": "HTML",
              },
              "ccRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "bob@example.com",
                  },
                },
                Object {
                  "emailAddress": Object {
                    "address": "robert@example.com",
                  },
                },
              ],
              "subject": "a subject",
              "toRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "jim@example.com",
                  },
                },
              ],
            },
          },
          "headers": Object {},
          "httpAgent": undefined,
          "httpsAgent": Agent {
            "_events": Object {
              "free": [Function],
              "newListener": [Function],
            },
            "_eventsCount": 2,
            "_maxListeners": undefined,
            "_sessionCache": Object {
              "list": Array [],
              "map": Object {},
            },
            "agentKeepAliveTimeoutBuffer": 1000,
            "defaultPort": 443,
            "freeSockets": Object {},
            "keepAlive": false,
            "keepAliveMsecs": 1000,
            "maxCachedSessions": 100,
            "maxFreeSockets": 256,
            "maxSockets": Infinity,
            "maxTotalSockets": Infinity,
            "options": Object {
              "defaultPort": 443,
              "noDelay": true,
              "path": null,
              "protocol": "https:",
              "rejectUnauthorized": true,
            },
            "protocol": "https:",
            "requests": Object {},
            "scheduling": "lifo",
            "sockets": Object {},
            "totalSocketCount": 0,
            Symbol(shapeMode): false,
            Symbol(kCapture): false,
          },
          "maxContentLength": 1000000,
          "method": "post",
          "proxy": false,
          "timeout": 360000,
          "validateStatus": [Function],
        },
      ]
    `);
  });

  test('throw the exception and log the proper error if message was not sent successfuly', async () => {
    const connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
    axiosInstanceMock.mockReturnValueOnce({
      status: 400,
      data: {
        error: {
          code: 'ErrorMimeContentInvalidBase64String',
          message: 'Invalid base64 string for MIME content.',
        },
      },
    });

    await expect(
      sendEmailGraphApi(
        { options: getSendEmailOptions(), messageHTML: 'test1', headers: {}, attachments: [] },
        logger,
        configurationUtilities,
        connectorUsageCollector
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"{\\"error\\":{\\"code\\":\\"ErrorMimeContentInvalidBase64String\\",\\"message\\":\\"Invalid base64 string for MIME content.\\"}}"'
    );

    expect(logger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "error thrown sending Microsoft Exchange email for clientID: undefined: {\\"error\\":{\\"code\\":\\"ErrorMimeContentInvalidBase64String\\",\\"message\\":\\"Invalid base64 string for MIME content.\\"}}",
      ]
    `);
  });

  describe('sendEmailWithAttachments', () => {
    test('email adds a small attachment', async () => {
      const connectorUsageCollector = new ConnectorUsageCollector({
        logger,
        connectorId: 'test-connector-id',
      });

      // create draft
      axiosInstanceMock.mockReturnValueOnce({
        status: 201,
        data: { id: 'draftId' },
      });
      // add small attachment
      axiosInstanceMock.mockReturnValueOnce({
        status: 201,
      });
      // send draft
      axiosInstanceMock.mockReturnValueOnce({
        status: 202,
      });
      const axiosInstance = axios.create();

      await sendEmailWithAttachments({
        sendEmailOptions: {
          options: getSendEmailOptions(),
          messageHTML: 'test1',
          attachments: [
            {
              content: 'dGVzdC1vdXRwdXR0ZXN0LW91dHB1dA==',
              contentType: 'test-content-type',
              encoding: 'base64',
              filename: 'report.pdf',
            },
          ],
          headers: {},
        },
        logger,
        configurationUtilities,
        connectorUsageCollector,
        axiosInstance,
      });

      expect(axiosInstanceMock).toHaveBeenCalledTimes(3);

      const [createDraftUrl, createDraft] = axiosInstanceMock.mock.calls[0];
      expect(createDraftUrl).toEqual(
        'https://graph.microsoft.com/v1.0/users/fred@example.com/messages'
      );
      expect(createDraft.data).toEqual({
        bccRecipients: [],
        body: {
          content: 'test1',
          contentType: 'HTML',
        },
        ccRecipients: [
          {
            emailAddress: {
              address: 'bob@example.com',
            },
          },
          {
            emailAddress: {
              address: 'robert@example.com',
            },
          },
        ],
        subject: 'a subject',
        toRecipients: [
          {
            emailAddress: {
              address: 'jim@example.com',
            },
          },
        ],
      });

      const [addAttachmentUrl, addAttachment] = axiosInstanceMock.mock.calls[1];
      expect(addAttachmentUrl).toEqual(
        'https://graph.microsoft.com/v1.0/users/fred@example.com/messages/draftId/attachments'
      );
      expect(addAttachment.data).toEqual({
        '@odata.type': '#microsoft.graph.fileAttachment',
        contentBytes: 'dGVzdC1vdXRwdXR0ZXN0LW91dHB1dA==',
        contentType: 'test-content-type',
        name: 'report.pdf',
      });

      const [sendDraftUrl] = axiosInstanceMock.mock.calls[2];
      expect(sendDraftUrl).toEqual(
        'https://graph.microsoft.com/v1.0/users/fred@example.com/messages/draftId/send'
      );
    });

    test('email uploads a large attachment', async () => {
      const connectorUsageCollector = new ConnectorUsageCollector({
        logger,
        connectorId: 'test-connector-id',
      });

      // create draft
      axiosInstanceMock.mockReturnValueOnce({
        status: 201,
        data: { id: 'draftId' },
      });
      // create upload session
      axiosInstanceMock.mockReturnValueOnce({
        status: 201,
        data: { uploadUrl: 'http://test-upload-session.com' },
      });
      // upload attachment 1/3
      axiosInstanceMock.mockReturnValueOnce({
        status: 200,
      });
      // upload attachment 2/3
      axiosInstanceMock.mockReturnValueOnce({
        status: 200,
      });
      // upload attachment 3/3
      axiosInstanceMock.mockReturnValueOnce({
        status: 200,
      });
      // close upload session
      axiosInstanceMock.mockReturnValueOnce({
        status: 204,
      });
      // send draft
      axiosInstanceMock.mockReturnValueOnce({
        status: 202,
      });
      const axiosInstance = axios.create();

      await sendEmailWithAttachments(
        {
          sendEmailOptions: {
            options: getSendEmailOptions(),
            messageHTML: 'test1',
            attachments: [
              {
                content: 'dGVzdC1vdXRwdXR0ZXN0LW91dHB1dA==',
                contentType: 'test-content-type',
                encoding: 'base64',
                filename: 'report.pdf',
              },
            ],
            headers: {},
          },
          logger,
          configurationUtilities,
          connectorUsageCollector,
          axiosInstance,
        },
        30,
        10
      );
      expect(axiosInstanceMock).toHaveBeenCalledTimes(7);

      const [createDraftUrl, createDraft] = axiosInstanceMock.mock.calls[0];
      expect(createDraftUrl).toEqual(
        'https://graph.microsoft.com/v1.0/users/fred@example.com/messages'
      );
      expect(createDraft.data).toEqual({
        bccRecipients: [],
        body: {
          content: 'test1',
          contentType: 'HTML',
        },
        ccRecipients: [
          {
            emailAddress: {
              address: 'bob@example.com',
            },
          },
          {
            emailAddress: {
              address: 'robert@example.com',
            },
          },
        ],
        subject: 'a subject',
        toRecipients: [
          {
            emailAddress: {
              address: 'jim@example.com',
            },
          },
        ],
      });

      const [createUploadSessionUrl, createUploadSession] = axiosInstanceMock.mock.calls[1];
      expect(createUploadSessionUrl).toEqual(
        'https://graph.microsoft.com/v1.0/users/fred@example.com/messages/draftId/attachments/createUploadSession'
      );
      expect(createUploadSession.data).toEqual({
        AttachmentItem: {
          attachmentType: 'file',
          name: 'report.pdf',
          size: 22,
        },
      });

      const [uploadAttachmentUrl1, uploadAttachment1] = axiosInstanceMock.mock.calls[2];
      expect(uploadAttachmentUrl1).toEqual('http://test-upload-session.com');
      expect(uploadAttachment1.data).toBeTruthy();
      expect(uploadAttachment1.headers).toEqual({
        'Content-Length': '10',
        'Content-Range': 'bytes 0-9/22',
        'Content-Type': 'application/octet-stream',
      });

      const [uploadAttachmentUrl2, uploadAttachment2] = axiosInstanceMock.mock.calls[3];
      expect(uploadAttachmentUrl2).toEqual('http://test-upload-session.com');
      expect(uploadAttachment2.data).toBeTruthy();
      expect(uploadAttachment2.headers).toEqual({
        'Content-Length': '10',
        'Content-Range': 'bytes 10-19/22',
        'Content-Type': 'application/octet-stream',
      });

      const [uploadAttachmentUrl3, uploadAttachment3] = axiosInstanceMock.mock.calls[4];
      expect(uploadAttachmentUrl3).toEqual('http://test-upload-session.com');
      expect(uploadAttachment3.data).toBeTruthy();
      expect(uploadAttachment3.headers).toEqual({
        'Content-Length': '2',
        'Content-Range': 'bytes 20-21/22',
        'Content-Type': 'application/octet-stream',
      });

      const [closeUploadSessionUrl] = axiosInstanceMock.mock.calls[5];
      expect(closeUploadSessionUrl).toEqual('http://test-upload-session.com');

      const [sendDraftUrl] = axiosInstanceMock.mock.calls[6];
      expect(sendDraftUrl).toEqual(
        'https://graph.microsoft.com/v1.0/users/fred@example.com/messages/draftId/send'
      );
    });
  });
});

function getSendEmailOptions(
  { content = {}, routing = {}, transport = {} } = {},
  proxySettings?: ProxySettings,
  customHostSettings?: CustomHostSettings
) {
  const configurationUtilities = actionsConfigMock.create();
  if (proxySettings) {
    configurationUtilities.getProxySettings.mockReturnValue(proxySettings);
  }
  if (customHostSettings) {
    configurationUtilities.getCustomHostSettings.mockReturnValue(customHostSettings);
  }
  return {
    content: {
      ...content,
      message: 'a message',
      subject: 'a subject',
    },
    routing: {
      ...routing,
      from: 'fred@example.com',
      to: ['jim@example.com'],
      cc: ['bob@example.com', 'robert@example.com'],
      bcc: [],
    },
    transport: {
      ...transport,
      service: 'exchange_server',
      clienySecret: 'gfhfh',
    },
    hasAuth: true,
    configurationUtilities,
    connectorId: '1',
  };
}
