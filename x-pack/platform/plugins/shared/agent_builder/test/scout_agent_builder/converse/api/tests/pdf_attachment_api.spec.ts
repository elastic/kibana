/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import {
  CHAT_ATTACHMENT_PDFS_FILE_KIND,
  SUPPORTED_PDF_MIME_TYPE,
} from '@kbn/agent-builder-common/attachments';
import type { CreateAttachmentResponse } from '../../../../../common/http_api/attachments';
import type { ChatResponse } from '../../../../../common/http_api/chat';
import type { AuthedApiClient } from '../../../../scout_agent_builder_shared/lib/authed_api_client';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest, API_AGENT_BUILDER, INTERNAL_AGENT_BUILDER } from '../fixtures';

apiTest.describe('Agent Builder — pdf attachment API', { tag: [...tags.stateful.classic] }, () => {
  let llmProxy: LlmProxy;
  let connectorId: string;
  const createdConversationIds: string[] = [];
  const createdFileIds: string[] = [];

  apiTest.beforeAll(async ({ log, kbnClient }) => {
    llmProxy = await createLlmProxy(log);
    const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
    connectorId = id;
  });

  apiTest.afterEach(() => {
    llmProxy.clear();
  });

  apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
    for (const conversationId of createdConversationIds) {
      await asAdmin.delete(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`
      );
    }
    for (const fileId of createdFileIds) {
      await asAdmin.delete(
        `/api/files/files/${CHAT_ATTACHMENT_PDFS_FILE_KIND}/${encodeURIComponent(fileId)}`
      );
    }
    llmProxy.close();
    await deleteConnectorById(kbnClient, connectorId);
  });

  const createConversation = async (asAdmin: AuthedApiClient): Promise<string> => {
    await setupAgentDirectAnswer({
      proxy: llmProxy,
      title: 'Test Conversation',
      response: 'Test response',
    });
    const res = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
      body: { input: 'Hello', connector_id: connectorId, _execution_mode: 'local' },
      responseType: 'json',
    });
    expect(res).toHaveStatusCode(200);
    const { conversation_id: conversationId } = res.body as ChatResponse;
    await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
    createdConversationIds.push(conversationId);
    return conversationId;
  };

  const uploadPdf = async (
    asAdmin: AuthedApiClient,
    { name = 'invoice', content = '%PDF-1.4\n%%EOF' }: { name?: string; content?: string } = {}
  ): Promise<string> => {
    const createResponse = await asAdmin.post(
      `/api/files/files/${CHAT_ATTACHMENT_PDFS_FILE_KIND}`,
      { body: { name, mimeType: SUPPORTED_PDF_MIME_TYPE }, responseType: 'json' }
    );
    expect(createResponse).toHaveStatusCode(200);
    const fileId = createResponse.body.file.id as string;
    createdFileIds.push(fileId);

    const uploadResponse = await asAdmin.put(
      `/api/files/files/${CHAT_ATTACHMENT_PDFS_FILE_KIND}/${encodeURIComponent(fileId)}/blob`,
      {
        headers: { 'Content-Type': SUPPORTED_PDF_MIME_TYPE },
        body: Buffer.from(content),
        responseType: 'json',
      }
    );
    expect(uploadResponse).toHaveStatusCode(200);
    return fileId;
  };

  const attachmentsPath = (conversationId: string) =>
    `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}/attachments`;

  // FAKE_EXTRACTION:start - remove when Jina Reader document_extraction is live
  apiTest('reports that PDF reading is available', async ({ asAdmin }) => {
    const response = await asAdmin.get(`${INTERNAL_AGENT_BUILDER}/attachments/pdf/_available`, {
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ available: true });
  });

  apiTest('stores the extracted text of the PDF', async ({ asAdmin }) => {
    const conversationId = await createConversation(asAdmin);
    const fileId = await uploadPdf(asAdmin);

    const response = await asAdmin.post(attachmentsPath(conversationId), {
      body: { type: 'pdf', origin: fileId },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const { attachment } = response.body as CreateAttachmentResponse;
    expect(attachment.type).toBe('pdf');
    expect(attachment.versions.at(-1)?.data).toStrictEqual({
      file_id: fileId,
      name: 'invoice',
      text: '# Fake PDF\n\nThe PDF contains one word: Hello',
    });
  });

  apiTest('rejects a PDF that fails to be read with a clear message', async ({ asAdmin }) => {
    const conversationId = await createConversation(asAdmin);
    const fileId = await uploadPdf(asAdmin, { name: 'error.pdf' });

    const response = await asAdmin.post(attachmentsPath(conversationId), {
      body: { type: 'pdf', origin: fileId },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('Could not read the PDF. Try again later.');
  });
  // FAKE_EXTRACTION:end

  apiTest('rejects a file that is not a PDF with a clear message', async ({ asAdmin }) => {
    const conversationId = await createConversation(asAdmin);
    const fileId = await uploadPdf(asAdmin, { content: 'hello' });

    const response = await asAdmin.post(attachmentsPath(conversationId), {
      body: { type: 'pdf', origin: fileId },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('The file is not a valid PDF.');
  });

  apiTest('rejects a file id that does not exist with a clear message', async ({ asAdmin }) => {
    const conversationId = await createConversation(asAdmin);

    const response = await asAdmin.post(attachmentsPath(conversationId), {
      body: { type: 'pdf', origin: 'does-not-exist' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('PDF file not found.');
  });

  apiTest('still adds other attachments after a rejected PDF', async ({ asAdmin }) => {
    const conversationId = await createConversation(asAdmin);
    const fileId = await uploadPdf(asAdmin, { content: 'hello' });

    const pdfResponse = await asAdmin.post(attachmentsPath(conversationId), {
      body: { type: 'pdf', origin: fileId },
      responseType: 'json',
    });
    expect(pdfResponse).toHaveStatusCode(400);

    const textResponse = await asAdmin.post(attachmentsPath(conversationId), {
      body: { type: 'text', data: { content: 'test content' } },
      responseType: 'json',
    });
    expect(textResponse).toHaveStatusCode(200);
    expect((textResponse.body as CreateAttachmentResponse).attachment.type).toBe('text');
  });
});
