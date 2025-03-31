/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalysisResult, PreviewTikaResponse } from '@kbn/file-upload-plugin/common/types';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import { FILE_FORMATS } from '../../../../../common/constants';

export async function analyzeTikaFile(
  data: ArrayBuffer,
  fileUpload: FileUploadStartApi
): Promise<{ standardResults: AnalysisResult; tikaResults: PreviewTikaResponse }> {
  const resp = await fileUpload.previewTikaFile(data);
  const numLinesAnalyzed = (resp.content.match(/\n/g) || '').length + 1;

  return {
    tikaResults: resp,
    standardResults: {
      results: {
        format: FILE_FORMATS.TIKA,
        document_type: resp.content_type,
        charset: 'utf-8',
        has_header_row: false,
        has_byte_order_marker: false,
        sample_start: '',
        quote: '',
        delimiter: '',
        need_client_timezone: false,
        num_lines_analyzed: numLinesAnalyzed,
        num_messages_analyzed: 0,
        explanation: [],
        field_stats: {
          // @ts-expect-error semantic_text not supported
          'attachment.content': {},
          // @ts-expect-error semantic_text not supported
          'attachment.content_length': {},
          // @ts-expect-error semantic_text not supported
          'attachment.content_type': {},
          // @ts-expect-error semantic_text not supported
          'attachment.format': {},
          // @ts-expect-error semantic_text not supported
          'attachment.language': {},
        },
        mappings: {
          properties: {
            attachment: {
              // @ts-expect-error semantic_text not supported
              properties: {
                content: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                content_length: {
                  type: 'long',
                },
                content_type: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                format: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                language: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
              },
            },
          },
        },
        ingest_pipeline: {
          description: 'Ingest pipeline created by file data visualizer',
          processors: [
            {
              attachment: {
                field: 'data',
                remove_binary: true,
                // unlimited character count
                indexed_chars: -1,
              },
            },
          ],
        },
      },
    },
  };
}
