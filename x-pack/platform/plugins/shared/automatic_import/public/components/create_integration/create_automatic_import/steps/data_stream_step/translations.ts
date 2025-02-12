/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { GenerationErrorAttributes } from '../../../../../../common/api/generation_error';
import { GenerationErrorCode } from '../../../../../../common/constants';

export const INTEGRATION_NAME_TITLE = i18n.translate(
  'xpack.automaticImport.step.dataStream.integrationNameTitle',
  {
    defaultMessage: 'Define package name',
  }
);
export const INTEGRATION_NAME_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.step.dataStream.integrationNameDescription',
  {
    defaultMessage:
      "The package name is used to refer to the integration in Elastic's ingest pipeline",
  }
);
export const DATA_STREAM_TITLE = i18n.translate(
  'xpack.automaticImport.step.dataStream.dataStreamTitle',
  {
    defaultMessage: 'Define data stream and upload logs',
  }
);
export const DATA_STREAM_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.step.dataStream.dataStreamDescription',
  {
    defaultMessage:
      'Logs are analyzed to automatically map ECS fields and help create the ingestion pipeline',
  }
);

export const INTEGRATION_NAME_LABEL = i18n.translate(
  'xpack.automaticImport.step.dataStream.integrationName.label',
  {
    defaultMessage: 'Integration package name',
  }
);
export const NO_SPACES_HELP = i18n.translate(
  'xpack.automaticImport.step.dataStream.noSpacesHelpText',
  {
    defaultMessage:
      'Name must be at least 2 characters long, start with a letter, and can only contain lowercase letters, numbers, and underscores (_)',
  }
);
export const PACKAGE_NAMES_FETCH_ERROR = i18n.translate(
  'xpack.automaticImport.step.dataStream.packageNamesFetchError',
  {
    defaultMessage: 'Error fetching package names',
  }
);
export const NAME_ALREADY_EXISTS_ERROR = i18n.translate(
  'xpack.automaticImport.step.dataStream.nameAlreadyExistsError',
  {
    defaultMessage: 'This integration name is already in use. Please choose a different name.',
  }
);

export const DATA_STREAM_TITLE_LABEL = i18n.translate(
  'xpack.automaticImport.step.dataStream.dataStreamTitle.label',
  {
    defaultMessage: 'Data stream title',
  }
);

export const DATA_STREAM_DESCRIPTION_LABEL = i18n.translate(
  'xpack.automaticImport.step.dataStream.dataStreamDescription.label',
  {
    defaultMessage: 'Data stream description',
  }
);

export const DATA_STREAM_NAME_LABEL = i18n.translate(
  'xpack.automaticImport.step.dataStream.dataStreamName.label',
  {
    defaultMessage: 'Data stream name',
  }
);

export const DATA_COLLECTION_METHOD_LABEL = i18n.translate(
  'xpack.automaticImport.step.dataStream.dataCollectionMethod.label',
  {
    defaultMessage: 'Data collection method',
  }
);

export const ADD_OPEN_API_SPEC_LABEL = i18n.translate(
  'xpack.automaticImport.step.dataStream.addOpenApiSpecLabel',
  {
    defaultMessage: 'OpenAPI Spec',
  }
);
export const ADD_OPEN_API_SPEC_OPTIONAL_LABEL = i18n.translate(
  'xpack.automaticImport.step.dataStream.addOpenApiSpecOptionalLabel',
  {
    defaultMessage: 'Optional',
  }
);
export const ADD_OPEN_API_SPEC_BUTTON = i18n.translate(
  'xpack.automaticImport.step.dataStream.addOpenApiSpecButton',
  {
    defaultMessage: 'Add OpenAPI spec file',
  }
);
export const OPEN_API_SPEC_BUTTON_CONFIGURED = i18n.translate(
  'xpack.automaticImport.step.dataStream.openApiSpecButtonConfigured',
  {
    defaultMessage: 'OpenAPI spec file configured',
  }
);
export const EDIT_OPEN_API_SPEC_BUTTON = i18n.translate(
  'xpack.automaticImport.step.dataStream.editOpenApiSpecButton',
  {
    defaultMessage: 'Edit',
  }
);
export const ADD_OPEN_API_SPEC_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.step.dataStream.addOpenApiSpecDescription',
  {
    defaultMessage:
      'To successfully ingest CEL data from an API, provide the associated OpenAPI Specification (OAS) file.',
  }
);
export const TECH_PREVIEW = i18n.translate(
  'xpack.automaticImport.step.dataStream.techPreviewBadge',
  {
    defaultMessage: 'Technical preview',
  }
);
export const TECH_PREVIEW_TOOLTIP = i18n.translate(
  'xpack.automaticImport.step.dataStream.techPreviewTooltip',
  {
    defaultMessage:
      'This functionality is in technical preview and is subject to change. Please use with caution in production environments.',
  }
);

export const LOGS_SAMPLE_LABEL = i18n.translate(
  'xpack.automaticImport.step.dataStream.logsSample.label',
  {
    defaultMessage: 'Logs',
  }
);

export const LOGS_SAMPLE_WARNING = i18n.translate(
  'xpack.automaticImport.step.dataStream.logsSample.warning',
  {
    defaultMessage:
      'Please note that this data will be analyzed by a third-party AI tool. Ensure that you comply with privacy and security guidelines when selecting data.',
  }
);

export const LOGS_SAMPLE_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.step.dataStream.logsSample.description',
  {
    defaultMessage: 'Drag and drop a file or Browse files.',
  }
);
export const LOGS_SAMPLE_ERROR = {
  CAN_NOT_READ: i18n.translate('xpack.automaticImport.step.dataStream.logsSample.errorCanNotRead', {
    defaultMessage: 'Failed to read the logs sample file',
  }),
  CAN_NOT_READ_WITH_REASON: (reason: string) =>
    i18n.translate('xpack.automaticImport.step.dataStream.logsSample.errorCanNotReadWithReason', {
      values: { reason },
      defaultMessage: 'An error occurred when reading logs sample: {reason}',
    }),
  CAN_NOT_PARSE: i18n.translate(
    'xpack.automaticImport.step.dataStream.logsSample.errorCanNotParse',
    {
      defaultMessage: 'Cannot parse the logs sample file as either a JSON or NDJSON file',
    }
  ),
  TOO_LARGE_TO_PARSE: i18n.translate(
    'xpack.automaticImport.step.dataStream.logsSample.errorTooLargeToParse',
    {
      defaultMessage: 'This logs sample file is too large to parse',
    }
  ),
  NOT_ARRAY: i18n.translate('xpack.automaticImport.step.dataStream.logsSample.errorNotArray', {
    defaultMessage: 'The logs sample file is not an array',
  }),
  EMPTY: i18n.translate('xpack.automaticImport.step.dataStream.logsSample.errorEmpty', {
    defaultMessage: 'The logs sample file is empty',
  }),
  NOT_OBJECT: i18n.translate('xpack.automaticImport.step.dataStream.logsSample.errorNotObject', {
    defaultMessage: 'The logs sample file contains non-object entries',
  }),
};

export const ANALYZING = i18n.translate('xpack.automaticImport.step.dataStream.analyzing', {
  defaultMessage: 'Analyzing',
});
export const PROGRESS_ANALYZE_LOGS = i18n.translate(
  'xpack.automaticImport.step.dataStream.progress.analyzeLogs',
  {
    defaultMessage: 'Analyzing Sample logs',
  }
);
export const PROGRESS_ECS_MAPPING = i18n.translate(
  'xpack.automaticImport.step.dataStream.progress.ecsMapping',
  {
    defaultMessage: 'Mapping ECS fields',
  }
);
export const PROGRESS_CATEGORIZATION = i18n.translate(
  'xpack.automaticImport.step.dataStream.progress.categorization',
  {
    defaultMessage: 'Adding categorization',
  }
);
export const PROGRESS_RELATED_GRAPH = i18n.translate(
  'xpack.automaticImport.step.dataStream.progress.relatedGraph',
  {
    defaultMessage: 'Generating related fields',
  }
);
export const GENERATION_ERROR_TITLE = (progressStep: string) =>
  i18n.translate('xpack.automaticImport.step.dataStream.generationError', {
    values: { progressStep },
    defaultMessage: 'An error occurred during: {progressStep}',
  });

export const RETRY = i18n.translate('xpack.automaticImport.step.dataStream.retryButtonLabel', {
  defaultMessage: 'Retry',
});

export const DECODE_CEF_LINK = i18n.translate('xpack.automaticImport.errors.cefFormat.decodeLink', {
  defaultMessage: 'CEF format not supported yet. Instead please use CEF Integration:',
});

export const GENERATION_ERROR_TRANSLATION: Record<
  GenerationErrorCode,
  string | ((attributes: GenerationErrorAttributes) => string)
> = {
  [GenerationErrorCode.RECURSION_LIMIT_ANALYZE_LOGS]: i18n.translate(
    'xpack.automaticImport.errors.recursionLimitAnalyzeLogsErrorMessage',
    {
      defaultMessage:
        'Please verify the format of log samples is correct and try again. Try with a fewer samples if error persists.',
    }
  ),
  [GenerationErrorCode.RECURSION_LIMIT]: i18n.translate(
    'xpack.automaticImport.errors.recursionLimitReached',
    {
      defaultMessage: 'Max attempts exceeded. Please try again.',
    }
  ),
  [GenerationErrorCode.UNSUPPORTED_LOG_SAMPLES_FORMAT]: (attributes) => {
    if (attributes.logFormat !== undefined && attributes.logFormat?.length !== 0) {
      return i18n.translate('xpack.automaticImport.errors.uparseableCSV.withReason', {
        values: {
          format: attributes.logFormat,
        },
        defaultMessage: `Unsupported log format in the samples (format: {format}).`,
      });
    } else {
      return i18n.translate('xpack.automaticImport.errors.unsupportedLogSamples', {
        defaultMessage: `Unsupported log format in the samples.`,
      });
    }
  },
  [GenerationErrorCode.CEF_ERROR]: i18n.translate('xpack.automaticImport.errors.cefError', {
    // This is a default error message if the linking does not work.
    defaultMessage:
      'CEF format detected. Please decode the CEF logs into JSON format using filebeat decode_cef processor.',
  }),
  [GenerationErrorCode.UNPARSEABLE_CSV_DATA]: (attributes) => {
    if (
      attributes.underlyingMessages !== undefined &&
      attributes.underlyingMessages?.length !== 0
    ) {
      return i18n.translate('xpack.automaticImport.errors.uparseableCSV.withReason', {
        values: {
          reason: attributes.underlyingMessages[0],
        },
        defaultMessage: `Cannot parse the samples as the CSV data (reason: {reason}). Please check the provided samples.`,
      });
    } else {
      return i18n.translate('xpack.automaticImport.errors.uparseableCSV.withoutReason', {
        defaultMessage: `Cannot parse the samples as the CSV data. Please check the provided samples.`,
      });
    }
  },
};
