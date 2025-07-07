/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error missing type def
import stringify from 'json-stringify-safe';
import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { SendEmailOptions } from './send_email';
import type { Attachment } from '.';

const SMALL_ATTACHMENT_LIMIT = 3 * 1024 * 1024; // 3mb
const ATTACHMENT_CHUNK_SIZE = 2 * 1024 * 1024; // 2mb

export async function sendEmailGraphApi(
  sendEmailOptions: SendEmailGraphApiOptions,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  connectorUsageCollector: ConnectorUsageCollector,
  axiosInstance?: AxiosInstance
): Promise<AxiosResponse> {
  // Create a new axios instance if one is not provided
  axiosInstance = axiosInstance ?? axios.create();

  const { attachments } = sendEmailOptions;
  if (attachments.length > 0) {
    logger.debug('[MS Exchange] sending email with attachments');
    return sendEmailWithAttachments({
      sendEmailOptions,
      logger,
      configurationUtilities,
      connectorUsageCollector,
      axiosInstance,
    });
  }

  return sendEmail({
    sendEmailOptions,
    logger,
    configurationUtilities,
    connectorUsageCollector,
    axiosInstance,
  });
}

interface SendEmailGraphApiOptions {
  options: SendEmailOptions;
  headers: Record<string, string>;
  messageHTML: string;
  attachments: Attachment[];
}

interface SendEmailParams {
  sendEmailOptions: SendEmailGraphApiOptions;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  connectorUsageCollector: ConnectorUsageCollector;
  axiosInstance: AxiosInstance;
}

async function sendEmail({
  sendEmailOptions,
  logger,
  configurationUtilities,
  connectorUsageCollector,
  axiosInstance,
}: SendEmailParams): Promise<AxiosResponse> {
  const { options, headers, messageHTML } = sendEmailOptions;

  // POST /users/{id | userPrincipalName}/sendMail
  const res = await request({
    axios: axiosInstance,
    url: `${configurationUtilities.getMicrosoftGraphApiUrl()}/users/${
      options.routing.from
    }/sendMail`,
    method: 'post',
    logger,
    data: getMessage(options, messageHTML),
    headers,
    configurationUtilities,
    validateStatus: () => true,
    connectorUsageCollector,
  });
  if (res.status === 202) {
    return res.data;
  }
  const errString = stringify(res.data);
  logger.warn(
    `error thrown sending Microsoft Exchange email for clientID: ${options.transport.clientId}: ${errString}`
  );
  throw new Error(errString);
}

export async function sendEmailWithAttachments(
  params: SendEmailParams,
  smallAttachmentLimit: number = SMALL_ATTACHMENT_LIMIT,
  attachmentChunkSize: number = ATTACHMENT_CHUNK_SIZE
): Promise<AxiosResponse> {
  const logger = params.logger.get('ms-exchange');
  logger.debug('Creating draft email');
  const emailId = await createDraft(params);

  const attachments = params.sendEmailOptions.attachments;
  for (const attachment of attachments) {
    const size = Buffer.byteLength(attachment.content);
    if (size < smallAttachmentLimit) {
      // If attachment is smaller than the limit, add the attachment to the draft email
      logger.debug('Attachment is smaller than 2Mb, attaching to draft');
      await addAttachment(emailId, attachment, params);
    } else {
      // If attachment is larger than the limit,
      // create an upload session and upload attachment in chunks to the draft email
      const buffer = Buffer.from(attachment.content, attachment.encoding as BufferEncoding);
      const bufferSize = buffer.length;
      logger.debug('Attachment is larger than 2Mb, creating upload session');
      const uploadUrl = await createUploadSession(emailId, attachment.filename, bufferSize, params);
      logger.debug(`UploadUrl: ${uploadUrl}`);

      const chunks = getAttachmentChunks(buffer, bufferSize, attachmentChunkSize);
      let start = 0;
      let count = 1;
      for (const chunk of chunks) {
        const end = start + chunk.length - 1;
        const headers = {
          'Content-Type': 'application/octet-stream',
          'Content-Length': `${chunk.length}`,
          'Content-Range': `bytes ${start}-${end}/${bufferSize}`,
        };
        logger.debug(`Uploading chunk ${count} of ${chunks.length}`);
        await uploadAttachmentChunk(uploadUrl, chunk, headers, params);
        start = start + chunk.length;
        count++;
      }
      logger.debug('Closing upload session');
      await closeUploadSession(uploadUrl, params);
    }
  }

  logger.debug('Sending draft email');
  return sendDraft(emailId, params);
}

function getMessage(emailOptions: SendEmailOptions, messageHTML: string) {
  const { routing, content } = emailOptions;
  const { to, cc, bcc } = routing;
  const { subject } = content;
  return {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: messageHTML,
      },
      toRecipients: to.map((toAddr) => ({
        emailAddress: {
          address: toAddr,
        },
      })),
      ccRecipients: cc.map((ccAddr) => ({
        emailAddress: {
          address: ccAddr,
        },
      })),
      bccRecipients: bcc.map((bccAddr) => ({
        emailAddress: {
          address: bccAddr,
        },
      })),
    },
  };
}

function getAttachmentChunks(buffer: Buffer, size: number, attachmentChunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  let start = 0;
  while (start < size) {
    const end = Math.min(start + attachmentChunkSize, size);
    const chunk = buffer.subarray(start, end);
    chunks.push(chunk);
    start = end;
  }
  return chunks;
}

async function createDraft({
  sendEmailOptions,
  logger,
  configurationUtilities,
  connectorUsageCollector,
  axiosInstance,
}: SendEmailParams): Promise<string> {
  const { options, headers, messageHTML } = sendEmailOptions;

  // POST /users/{id | userPrincipalName}/messages
  const { message } = getMessage(options, messageHTML);
  const res = await request({
    axios: axiosInstance,
    url: `${configurationUtilities.getMicrosoftGraphApiUrl()}/users/${
      options.routing.from
    }/messages`,
    method: 'post',
    logger,
    data: message,
    headers,
    configurationUtilities,
    validateStatus: () => true,
    connectorUsageCollector,
  });

  if (res.status !== 201) {
    const errString = stringify(res.data);
    logger.warn(
      `error thrown creating Microsoft Exchange email with attachments for clientID: ${options.transport.clientId}: ${errString}`
    );
    throw new Error(errString);
  }
  return res.data.id;
}

async function sendDraft(
  emailId: string,
  {
    sendEmailOptions,
    logger,
    configurationUtilities,
    connectorUsageCollector,
    axiosInstance,
  }: SendEmailParams
): Promise<AxiosResponse> {
  const { options, headers } = sendEmailOptions;

  // POST /users/{id | userPrincipalName}/messages/{emailId}/send
  const res = await request({
    axios: axiosInstance,
    url: `${configurationUtilities.getMicrosoftGraphApiUrl()}/users/${
      options.routing.from
    }/messages/${emailId}/send`,
    method: 'post',
    logger,
    data: {},
    headers,
    configurationUtilities,
    validateStatus: () => true,
    connectorUsageCollector,
  });
  if (res.status === 202) {
    return res.data;
  }
  const errString = stringify(res.data);
  logger.warn(
    `error thrown sending Microsoft Exchange email with attachments for clientID: ${options.transport.clientId}: ${errString}`
  );
  throw new Error(errString);
}

async function createUploadSession(
  emailId: string,
  name: string,
  size: number,
  {
    sendEmailOptions,
    logger,
    configurationUtilities,
    connectorUsageCollector,
    axiosInstance,
  }: SendEmailParams
): Promise<string> {
  const { options, headers } = sendEmailOptions;

  // POST /users/{id | userPrincipalName}/messages/{emailId}/attachments/createUploadSession
  const res = await request({
    axios: axiosInstance,
    url: `${configurationUtilities.getMicrosoftGraphApiUrl()}/users/${
      options.routing.from
    }/messages/${emailId}/attachments/createUploadSession`,
    method: 'post',
    logger,
    data: {
      AttachmentItem: {
        attachmentType: 'file',
        name,
        size,
      },
    },
    headers,
    configurationUtilities,
    validateStatus: () => true,
    connectorUsageCollector,
  });
  if (res.status !== 201) {
    const errString = stringify(res.data);
    logger.warn(
      `error thrown creating Microsoft Exchange attachment upload session for clientID: ${options.transport.clientId}: ${errString}`
    );
    throw new Error(errString);
  }
  return res.data.uploadUrl;
}

async function closeUploadSession(
  uploadUrl: string,
  {
    sendEmailOptions,
    logger,
    configurationUtilities,
    connectorUsageCollector,
    axiosInstance,
  }: SendEmailParams
): Promise<AxiosResponse> {
  const { options } = sendEmailOptions;

  const res = await request({
    axios: axiosInstance,
    url: uploadUrl,
    method: 'delete',
    logger,
    configurationUtilities,
    validateStatus: () => true,
    connectorUsageCollector,
  });
  if (res.status === 204) {
    return res.data;
  }
  const errString = stringify(`${res.status} ${res.statusText}`);
  logger.warn(
    `error thrown closing Microsoft Exchange attachment upload session for clientID: ${options.transport.clientId}: ${errString}`
  );
  throw new Error(errString);
}

async function addAttachment(
  emailId: string,
  attachment: Attachment,
  {
    sendEmailOptions,
    logger,
    configurationUtilities,
    connectorUsageCollector,
    axiosInstance,
  }: SendEmailParams
): Promise<AxiosResponse> {
  const { options, headers } = sendEmailOptions;
  const responseSettings = configurationUtilities.getResponseSettings();

  // POST /users/{id | userPrincipalName}/messages/{emailId}/attachments
  const res = await request({
    axios: axiosInstance,
    url: `${configurationUtilities.getMicrosoftGraphApiUrl()}/users/${
      options.routing.from
    }/messages/${emailId}/attachments`,
    method: 'post',
    logger,
    data: {
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: attachment.filename,
      contentType: attachment.contentType,
      contentBytes: attachment.content,
    },
    headers,
    configurationUtilities: {
      ...configurationUtilities,
      // override maxContentLength config for requests with attachments
      getResponseSettings: () => ({
        ...responseSettings,
        maxContentLength: SMALL_ATTACHMENT_LIMIT,
      }),
    },
    validateStatus: () => true,
    connectorUsageCollector,
  });
  if (res.status === 201) {
    return res.data;
  }
  const errString = stringify(res.data);
  logger.warn(
    `error thrown adding attachment to Microsoft Exchange email for clientID: ${options.transport.clientId}: ${errString}`
  );
  throw new Error(errString);
}

async function uploadAttachmentChunk(
  uploadUrl: string,
  chunk: Buffer,
  headers: Record<string, string>,
  {
    sendEmailOptions,
    logger,
    configurationUtilities,
    connectorUsageCollector,
    axiosInstance,
  }: SendEmailParams
): Promise<void> {
  const { options } = sendEmailOptions;
  const responseSettings = configurationUtilities.getResponseSettings();

  const res = await request({
    axios: axiosInstance,
    url: uploadUrl,
    method: 'put',
    logger,
    data: chunk,
    headers,
    configurationUtilities: {
      ...configurationUtilities,
      // Override maxContentLength config for requests with attachments
      getResponseSettings: () => ({
        ...responseSettings,
        maxContentLength: SMALL_ATTACHMENT_LIMIT,
      }),
    },
    validateStatus: () => true,
    connectorUsageCollector,
  });

  if (res.status !== 200 && res.status !== 201) {
    const errString = stringify(res.data);
    logger.warn(
      `error thrown uploading attachment to Microsoft Exchange email for clientID: ${options.transport.clientId}: ${errString}`
    );
    throw new Error(errString);
  }
}
