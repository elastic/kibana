/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FLYOUT_TITLE = i18n.translate('xpack.evals.importDatasetFlyout.flyoutTitle', {
  defaultMessage: 'Import dataset file',
});
export const FILE_STEP_TITLE = i18n.translate('xpack.evals.importDatasetFlyout.fileStepTitle', {
  defaultMessage: 'File',
});
export const MAP_STEP_TITLE = i18n.translate('xpack.evals.importDatasetFlyout.mapStepTitle', {
  defaultMessage: 'Map fields',
});
export const VALIDATE_STEP_TITLE = i18n.translate(
  'xpack.evals.importDatasetFlyout.validateStepTitle',
  { defaultMessage: 'Validate' }
);
export const RESULT_STEP_TITLE = i18n.translate('xpack.evals.importDatasetFlyout.resultStepTitle', {
  defaultMessage: 'Result',
});
export const DESTINATION_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.destinationLabel',
  { defaultMessage: 'Import destination' }
);
export const EXISTING_DATASET_OPTION_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.existingDatasetDropDownOptionLabel',
  { defaultMessage: 'Existing dataset' }
);
export const NEW_DATASET_OPTION_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.newDatasetDropDownOptionLabel',
  { defaultMessage: 'Create new dataset' }
);
export const DATASET_LABEL = i18n.translate('xpack.evals.importDatasetFlyout.datasetLabel', {
  defaultMessage: 'Dataset',
});
export const DATASET_PLACEHOLDER = i18n.translate(
  'xpack.evals.importDatasetFlyout.datasetPlaceholder',
  { defaultMessage: 'Select a dataset' }
);
export const NEW_DATASET_NAME_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.newDatasetNameLabel',
  { defaultMessage: 'Dataset name' }
);
export const NEW_DATASET_DESCRIPTION_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.newDatasetDescriptionLabel',
  { defaultMessage: 'Description' }
);
export const FILE_LABEL = i18n.translate('xpack.evals.importDatasetFlyout.fileLabel', {
  defaultMessage: 'CSV or JSONL file',
});
export const FILE_PICKER_PROMPT = i18n.translate(
  'xpack.evals.importDatasetFlyout.filePickerDescription',
  { defaultMessage: 'Select a .csv, .jsonl, or .ndjson file up to 50 MB' }
);
export const FILE_TOO_LARGE_ERROR = i18n.translate(
  'xpack.evals.importDatasetFlyout.fileTooLargeErrorMessage',
  { defaultMessage: 'The selected file exceeds the 50 MB limit.' }
);
export const UNSUPPORTED_FILE_ERROR = i18n.translate(
  'xpack.evals.importDatasetFlyout.unsupportedFileErrorMessage',
  { defaultMessage: 'Select a CSV, JSONL, or NDJSON file.' }
);
export const EMPTY_FILE_ERROR = i18n.translate(
  'xpack.evals.importDatasetFlyout.emptyFileErrorMessage',
  { defaultMessage: 'The selected file does not contain any data rows.' }
);
export const READ_FILE_ERROR = i18n.translate(
  'xpack.evals.importDatasetFlyout.readFileErrorMessage',
  { defaultMessage: 'The file could not be read.' }
);
export const MAPPING_DESCRIPTION = i18n.translate(
  'xpack.evals.importDatasetFlyout.mappingDescription',
  {
    defaultMessage:
      'Choose where each source column belongs. At least one column must map to input or output.',
  }
);
export const SOURCE_COLUMN_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.sourceColumnLabel',
  { defaultMessage: 'Source column' }
);
export const DESTINATION_FIELD_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.destinationFieldLabel',
  { defaultMessage: 'Destination field' }
);
export const MAPPING_TABLE_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.mappingTableLabel',
  { defaultMessage: 'Dataset field mapping' }
);
export const getMappingAriaLabel = (column: string) =>
  i18n.translate('xpack.evals.importDatasetFlyout.mappingSelectAriaLabel', {
    defaultMessage: 'Destination for {column}',
    values: { column },
  });
export const INPUT_OPTION_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.inputDropDownOptionLabel',
  { defaultMessage: 'Input' }
);
export const OUTPUT_OPTION_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.outputDropDownOptionLabel',
  { defaultMessage: 'Output' }
);
export const METADATA_OPTION_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.metadataDropDownOptionLabel',
  { defaultMessage: 'Metadata' }
);
export const IGNORE_OPTION_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.ignoreDropDownOptionLabel',
  { defaultMessage: 'Ignore' }
);
export const INVALID_MAPPING_ERROR = i18n.translate(
  'xpack.evals.importDatasetFlyout.invalidMappingErrorMessage',
  { defaultMessage: 'Map at least one column to input or output.' }
);
export const PREVIEW_TITLE = i18n.translate('xpack.evals.importDatasetFlyout.previewTitle', {
  defaultMessage: 'Preview',
});
export const PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.evals.importDatasetFlyout.previewDescription',
  { defaultMessage: 'Showing up to the first 50 valid rows.' }
);
export const PREVIEW_TABLE_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.previewTableLabel',
  { defaultMessage: 'Imported file preview' }
);
export const ROW_NUMBER_LABEL = i18n.translate('xpack.evals.importDatasetFlyout.rowNumberLabel', {
  defaultMessage: 'Row',
});
export const VALIDATION_SUCCESS_TITLE = i18n.translate(
  'xpack.evals.importDatasetFlyout.validationSuccessTitle',
  { defaultMessage: 'File is ready to import' }
);
export const VALIDATION_WARNING_TITLE = i18n.translate(
  'xpack.evals.importDatasetFlyout.validationWarningTitle',
  { defaultMessage: 'Some rows will not be imported' }
);
export const NO_VALID_ROWS_TITLE = i18n.translate(
  'xpack.evals.importDatasetFlyout.noValidRowsTitle',
  { defaultMessage: 'No valid rows to import' }
);
export const VALIDATION_BLOCKED_TITLE = i18n.translate(
  'xpack.evals.importDatasetFlyout.validationBlockedTitle',
  { defaultMessage: 'File cannot be imported' }
);
export const getDatasetCapacityError = (limit: number) =>
  i18n.translate('xpack.evals.importDatasetFlyout.datasetCapacityErrorMessage', {
    defaultMessage:
      'A dataset can contain at most {limit, number} examples. Reduce the number of rows in this import.',
    values: { limit },
  });
export const EXAMPLE_TOO_LARGE_ERROR = i18n.translate(
  'xpack.evals.importDatasetFlyout.exampleTooLargeErrorMessage',
  {
    defaultMessage:
      'At least one example exceeds the request size limit. Reduce the size of its mapped values.',
  }
);
export const ERROR_DETAILS_BUTTON_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.errorDetailsButtonLabel',
  { defaultMessage: 'View row errors' }
);
export const getValidationDescription = (valid: number, errors: number) =>
  i18n.translate('xpack.evals.importDatasetFlyout.validationCountsDescription', {
    defaultMessage:
      '{valid, plural, one {# valid row} other {# valid rows}} and {errors, plural, one {# errored row} other {# errored rows}} were found.',
    values: { valid, errors },
  });
export const getRowError = (rowNumber: number, message: string) =>
  i18n.translate('xpack.evals.importDatasetFlyout.rowErrorMessage', {
    defaultMessage: 'Row {rowNumber}: {message}',
    values: { rowNumber, message },
  });
export const getAdditionalFileErrorsDescription = (count: number) =>
  i18n.translate('xpack.evals.importDatasetFlyout.additionalFileErrorsDescription', {
    defaultMessage:
      '{count, plural, one {# additional file error was omitted.} other {# additional file errors were omitted.}}',
    values: { count },
  });
export const RESULT_SUCCESS_TITLE = i18n.translate(
  'xpack.evals.importDatasetFlyout.resultSuccessTitle',
  { defaultMessage: 'Import complete' }
);
export const RESULT_PARTIAL_TITLE = i18n.translate(
  'xpack.evals.importDatasetFlyout.resultPartialTitle',
  { defaultMessage: 'Import partially completed' }
);
export const getResultDescription = (added: number, skipped: number) =>
  i18n.translate('xpack.evals.importDatasetFlyout.resultCountsDescription', {
    defaultMessage:
      '{added, plural, one {# example added} other {# examples added}} and {skipped, plural, one {# duplicate skipped} other {# duplicates skipped}}.',
    values: { added, skipped },
  });
export const getFailedDescription = (failed: number) =>
  i18n.translate('xpack.evals.importDatasetFlyout.failedCountDescription', {
    defaultMessage: '{failed, plural, one {# example failed} other {# examples failed}} to import.',
    values: { failed },
  });
export const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);
export const BACK_BUTTON_LABEL = i18n.translate('xpack.evals.importDatasetFlyout.backButtonLabel', {
  defaultMessage: 'Back',
});
export const NEXT_BUTTON_LABEL = i18n.translate('xpack.evals.importDatasetFlyout.nextButtonLabel', {
  defaultMessage: 'Next',
});
export const getImportButtonLabel = (count: number) =>
  i18n.translate('xpack.evals.importDatasetFlyout.importButtonLabel', {
    defaultMessage: 'Import {count, plural, one {# example} other {# examples}}',
    values: { count },
  });
export const CLOSE_BUTTON_LABEL = i18n.translate(
  'xpack.evals.importDatasetFlyout.closeButtonLabel',
  { defaultMessage: 'Close' }
);
