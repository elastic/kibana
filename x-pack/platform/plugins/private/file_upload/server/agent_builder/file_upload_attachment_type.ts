/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  FILE_UPLOAD_ATTACHMENT_TYPE,
  fileUploadAttachmentDataSchema,
  type FileUploadAttachmentData,
} from '@kbn/file-upload-common';

/** Maximum number of field names listed in the agent-facing representation. */
const MAX_LISTED_FIELDS = 100;

export interface FileUploadAttachmentTypeDeps {
  getEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
  logger: Logger;
}

const isConcreteIndexName = (name: string): boolean =>
  name.length > 0 && !/[*,\s]/.test(name) && !/^[-_+]/.test(name);

const collectFieldNames = (properties: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(properties).flatMap(([name, value]) => {
    const path = prefix ? `${prefix}.${name}` : name;
    const { type, properties: nested } = (value ?? {}) as {
      type?: string;
      properties?: Record<string, unknown>;
    };
    if (nested) {
      return collectFieldNames(nested, path);
    }
    return [type ? `${path} (${type})` : path];
  });

const describeUploadedIndex = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<string> => {
  const [{ count }, mappings] = await Promise.all([
    esClient.count({ index }),
    esClient.indices.getMapping({ index }),
  ]);
  const properties = Object.values(mappings)[0]?.mappings?.properties ?? {};
  const fields = collectFieldNames(properties);
  const listedFields = fields.slice(0, MAX_LISTED_FIELDS);

  return [
    `The user uploaded data into the Elasticsearch index "${index}".`,
    `Document count: ${count}.`,
    `Fields (${fields.length}): ${listedFields.join(', ')}${
      fields.length > listedFields.length ? ', …' : ''
    }`,
    'Use your search and ES|QL tools against this index to answer questions about the uploaded data.',
  ].join('\n');
};

export const createFileUploadAttachmentType = ({
  getEsClient,
  logger,
}: FileUploadAttachmentTypeDeps): AttachmentTypeDefinition<
  typeof FILE_UPLOAD_ATTACHMENT_TYPE,
  FileUploadAttachmentData
> => ({
  id: FILE_UPLOAD_ATTACHMENT_TYPE,

  isReadonly: true,

  validate: (input) => {
    const result = fileUploadAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  onOriginUpdated: async ({ origin }, { request }) => {
    // The origin is sent by the browser, so confirm it names a single index the user can read.
    if (!isConcreteIndexName(origin)) {
      throw new Error(`"${origin}" is not a valid index name.`);
    }
    const esClient = await getEsClient(request);
    const exists = await esClient.indices.exists({ index: origin });
    if (!exists) {
      throw new Error(`Index "${origin}" does not exist or cannot be read.`);
    }
  },

  format: (attachment, { request }) => ({
    getRepresentation: async () => {
      const { origin, data } = attachment;
      if (!origin) {
        return {
          type: 'text',
          value: [
            'A file upload card is shown to the user. They have not uploaded a file yet.',
            data.reason ? `Reason shown on the card: ${data.reason}` : '',
            'Wait for the user to complete the upload before querying their data.',
          ]
            .filter(Boolean)
            .join('\n'),
        };
      }

      try {
        const esClient = await getEsClient(request);
        return { type: 'text', value: await describeUploadedIndex(esClient, origin) };
      } catch (error) {
        logger.warn(`Failed to describe uploaded index "${origin}": ${error}`);
        return {
          type: 'text',
          value: `The user uploaded data into the index "${origin}", but it cannot currently be read.`,
        };
      }
    },
  }),

  getAgentDescription: () =>
    'A file upload card lets the user upload a file (such as CSV, NDJSON, log or PDF files) into an Elasticsearch index from chat.\n\n' +
    'Rules:\n' +
    '- Render the card inline with `<render_attachment id="ATTACHMENT_ID" />` on its own line so the user can upload.\n' +
    '- The upload happens in the UI. You cannot upload files yourself and must not ask the user to paste file contents into chat.\n' +
    '- Once uploaded, the attachment content names the index, its document count and its fields.',
});
