/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';

/**
 * Event types.
 */
export const FILE_UPLOAD_EVENT = {
  FILE_ANALYSIS: 'file_upload.file_analysis',
  FILE_UPLOAD: 'file_upload.file_upload',
  UPLOAD_SESSION: 'file_upload.upload_session',
};

/**
 * Registers the file upload analytics events.
 */
export const registerFileUploadAnalyticsEvents = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: FILE_UPLOAD_EVENT.FILE_ANALYSIS,
    schema: {
      upload_session_id: {
        type: 'keyword',
        _meta: {
          description: 'The unique identifier for the upload session.',
        },
      },
      file_id: {
        type: 'keyword',
        _meta: {
          description: 'The unique identifier for the file being uploaded.',
        },
      },
      location: {
        type: 'keyword',
        _meta: {
          description:
            'The location in the app where the file upload analyze action was triggered from.',
        },
      },
      file_type: {
        type: 'keyword',
        _meta: {
          description:
            'The type of file being analyzed. Possible values are: delimited|semi_structured_text|ndjson|tika',
        },
      },
      file_extension: {
        type: 'keyword',
        _meta: {
          description: 'The file extension of the analyzed file.',
        },
      },
      file_size_bytes: {
        type: 'integer',
        _meta: {
          description: 'The size of the uploaded file in bytes.',
        },
      },
      num_lines_analyzed: {
        type: 'integer',
        _meta: {
          description: 'The number of lines that were analyzed in the file.',
        },
      },
      num_messages_analyzed: {
        type: 'integer',
        _meta: {
          description: 'The number of messages that were analyzed in the file.',
        },
      },
      java_timestamp_formats: {
        type: 'keyword',
        _meta: {
          description: 'The Java date formats that were detected in the file. Comma delimited.',
        },
      },
      num_fields_found: {
        type: 'integer',
        _meta: {
          description: 'The number of fields that were found in the file.',
        },
      },
      delimiter: {
        type: 'keyword',
        _meta: {
          description: 'The delimiter used in the file.',
        },
      },
      preview_success: {
        type: 'boolean',
        _meta: {
          description: 'Whether the docs preview was successful.',
        },
      },
      analysis_success: {
        type: 'boolean',
        _meta: {
          description: 'Whether the analysis was successful.',
        },
      },
      analysis_cancelled: {
        type: 'boolean',
        _meta: {
          description: 'Whether the analysis was cancelled.',
        },
      },
      overrides_used: {
        type: 'boolean',
        _meta: {
          description: 'Whether overrides were used during analysis.',
        },
      },
      analysis_time_ms: {
        type: 'integer',
        _meta: {
          description: 'The time taken to analyze the file in milliseconds.',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: FILE_UPLOAD_EVENT.FILE_UPLOAD,
    schema: {
      upload_session_id: {
        type: 'keyword',
        _meta: {
          description: 'The unique identifier for the upload session.',
        },
      },
      file_id: {
        type: 'keyword',
        _meta: {
          description: 'The unique identifier for the file being uploaded.',
        },
      },
      location: {
        type: 'keyword',
        _meta: {
          description:
            'The location in the app where the file upload analyze action was triggered from.',
        },
      },
      mapping_clash_new_fields: {
        type: 'integer',
        _meta: {
          description: 'The number of new fields that had a mapping clash when uploading the file.',
        },
      },
      mapping_clash_missing_fields: {
        type: 'integer',
        _meta: {
          description:
            'The number of missing fields that had a mapping clash when uploading the file.',
        },
      },
      file_size_bytes: {
        type: 'integer',
        _meta: {
          description: 'The size of the uploaded file in bytes.',
        },
      },
      documents_success: {
        type: 'integer',
        _meta: {
          description: 'The number of documents that were successfully indexed.',
        },
      },
      documents_failed: {
        type: 'integer',
        _meta: {
          description: 'The number of documents that failed to be indexed.',
        },
      },
      upload_success: {
        type: 'boolean',
        _meta: {
          description: 'Whether the file upload was successful.',
        },
      },
      upload_cancelled: {
        type: 'boolean',
        _meta: {
          description: 'Whether the file upload was cancelled.',
        },
      },
      upload_time_ms: {
        type: 'integer',
        _meta: {
          description: 'The time taken to upload the file in milliseconds.',
        },
      },
      file_extension: {
        type: 'keyword',
        _meta: {
          description: 'The file extension of the uploaded file.',
        },
      },
    },
  });

  analytics.registerEventType({
    eventType: FILE_UPLOAD_EVENT.UPLOAD_SESSION,
    schema: {
      upload_session_id: {
        type: 'keyword',
        _meta: {
          description: 'The unique identifier for the upload session.',
        },
      },
      location: {
        type: 'keyword',
        _meta: {
          description:
            'The location in the app where the file upload analyze action was triggered from.',
        },
      },
      total_files: {
        type: 'integer',
        _meta: {
          description: 'The total number of files in the upload session.',
        },
      },
      total_size_bytes: {
        type: 'integer',
        _meta: {
          description: 'The total size of all files in the upload session in bytes.',
        },
      },
      session_success: {
        type: 'boolean',
        _meta: {
          description: 'Whether the upload session was successful.',
        },
      },
      session_cancelled: {
        type: 'boolean',
        _meta: {
          description: 'Whether the upload session was cancelled.',
        },
      },
      session_time_ms: {
        type: 'integer',
        _meta: {
          description: 'The time taken for the upload session in milliseconds.',
        },
      },
      new_index_created: {
        type: 'boolean',
        _meta: {
          description: 'Whether a new index was created during the upload session.',
        },
      },
      data_view_created: {
        type: 'boolean',
        _meta: {
          description: 'Whether a new data view was created during the upload session.',
        },
      },
      mapping_clash_total_new_fields: {
        type: 'integer',
        _meta: {
          description:
            'The number of new fields that had a mapping clash when uploading the files.',
        },
      },
      mapping_clash_total_missing_fields: {
        type: 'integer',
        _meta: {
          description:
            'The number of missing fields that had a mapping clash when uploading the files.',
        },
      },
      contains_auto_added_semantic_text_field: {
        type: 'boolean',
        _meta: {
          description: 'Whether the mappings contains the auto-added semantic text field.',
        },
      },
    },
  });
};
