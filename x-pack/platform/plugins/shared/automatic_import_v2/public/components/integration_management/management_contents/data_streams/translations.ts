/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_DATA_STREAM_BUTTON = i18n.translate(
  'xpack.automaticImportV2.dataStreams.addDataStreamButton',
  {
    defaultMessage: 'Add Data Stream',
  }
);

export const DATA_STREAMS_TITLE = i18n.translate(
  'xpack.automaticImportV2.dataStreams.dataStreamsTitle',
  {
    defaultMessage: 'Data Streams',
  }
);

export const DATA_STREAMS_DESCRIPTION = i18n.translate(
  'xpack.automaticImportV2.dataStreams.dataStreamsDescription',
  {
    defaultMessage:
      'You can add multiple data streams. When the ECS fields are mapped, you can review the mapping and ingest pipeline for each data field.',
  }
);

export const CREATE_DATA_STREAM_TITLE = i18n.translate(
  'xpack.automaticImportV2.dataStreams.createDataStreamTitle',
  {
    defaultMessage: 'Data Stream',
  }
);

export const CREATE_DATA_STREAM_DESCRIPTION = i18n.translate(
  'xpack.automaticImportV2.dataStreams.createDataStreamDescription',
  {
    defaultMessage: 'Set up a custom ingestion pipeline based on sample data',
  }
);

export const DATA_STREAM_TITLE_LABEL = i18n.translate(
  'xpack.automaticImportV2.dataStreams.dataStreamTitleLabel',
  {
    defaultMessage: 'Data stream title',
  }
);

export const DATA_STREAM_DESCRIPTION_LABEL = i18n.translate(
  'xpack.automaticImportV2.dataStreams.dataStreamDescriptionLabel',
  {
    defaultMessage: 'Data stream description',
  }
);

export const DATA_COLLECTION_METHOD_LABEL = i18n.translate(
  'xpack.automaticImportV2.dataStreams.dataCollectionMethodLabel',
  {
    defaultMessage: 'Data collection method',
  }
);

export const LOGS_SECTION_TITLE = i18n.translate(
  'xpack.automaticImportV2.dataStreams.logsSectionTitle',
  {
    defaultMessage: 'Logs',
  }
);

export const LOGS_SECTION_DESCRIPTION = i18n.translate(
  'xpack.automaticImportV2.dataStreams.logsSectionDescription',
  {
    defaultMessage: 'Upload a sample log file, or select an index with sample data',
  }
);

export const AI_ANALYSIS_CALLOUT = i18n.translate(
  'xpack.automaticImportV2.dataStreams.aiAnalysisCallout',
  {
    defaultMessage:
      'Please note that this data will be analyzed by a third-party AI tool. Ensure that you comply with privacy and security guidelines when selecting data',
  }
);

export const UPLOAD_LOG_FILE_LABEL = i18n.translate(
  'xpack.automaticImportV2.dataStreams.uploadLogFileLabel',
  {
    defaultMessage: 'Upload a log file',
  }
);

export const SELECT_INDEX_LABEL = i18n.translate(
  'xpack.automaticImportV2.dataStreams.selectIndexLabel',
  {
    defaultMessage: 'Select an index',
  }
);

export const FILE_PICKER_PROMPT = i18n.translate(
  'xpack.automaticImportV2.dataStreams.filePickerPrompt',
  {
    defaultMessage: 'Select or drag and drop a file',
  }
);

export const CANCEL_BUTTON = i18n.translate('xpack.automaticImportV2.dataStreams.cancelButton', {
  defaultMessage: 'Cancel',
});

export const ANALYZE_LOGS_BUTTON = i18n.translate(
  'xpack.automaticImportV2.dataStreams.analyzeLogsButton',
  {
    defaultMessage: 'Analyze logs',
  }
);

export const LOG_FILE_ERROR = {
  CAN_NOT_READ: i18n.translate('xpack.automaticImportV2.dataStreams.logFileError.canNotRead', {
    defaultMessage: 'Failed to read the log file',
  }),
  CAN_NOT_READ_WITH_REASON: (reason: string) =>
    i18n.translate('xpack.automaticImportV2.dataStreams.logFileError.canNotReadWithReason', {
      defaultMessage: 'Failed to read the log file: {reason}',
      values: { reason },
    }),
  TOO_LARGE_TO_PARSE: i18n.translate(
    'xpack.automaticImportV2.dataStreams.logFileError.tooLargeToParse',
    {
      defaultMessage: 'This log file is too large to parse',
    }
  ),
};

export const SELECT_PLACEHOLDER = i18n.translate(
  'xpack.automaticImportV2.dataStreams.selectPlaceholder',
  {
    defaultMessage: 'Select...',
  }
);

export const ZERO_STATE_DESCRIPTION = i18n.translate(
  'xpack.automaticImportV2.dataStreams.zeroStateDescription',
  {
    defaultMessage: 'You have no data streams yet',
  }
);
