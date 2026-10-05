/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP_FIELD_ID, TIMESTAMP_LOGICAL_FIELD_NAME } from './constants';
import {
  errorModeAllowsBudget,
  validateDelimiter,
  validateDistinctCsvCharacter,
  validateEscapeCharacter,
  validateMaxErrorRatio,
  validateMaxErrors,
  validatePartitionPath,
  validateQuoteCharacter,
  validateSkipRows,
  type CreateDatasetFormValues,
} from './create_dataset_form_state';
import type { MappingEditorValue } from './mapping_step/mapping_editor';
import type { DatasetWizardStepId } from './types';

type MappingField = MappingEditorValue['fields'][number];

const CSV_CHARACTER_SETTING_NAMES = ['delimiter', 'quote', 'escape'] as const;

export const isTimestampField = (field: MappingField): boolean =>
  field.id === TIMESTAMP_FIELD_ID || field.name.trim() === TIMESTAMP_LOGICAL_FIELD_NAME;

/** A timestamp field, when present, needs a source path. */
export const isTimestampFieldValid = ({ fields }: MappingEditorValue): boolean => {
  const timestampField = fields.find(isTimestampField);
  return !timestampField || timestampField.path.trim() !== '';
};

/** Without schema inference, at least one named and typed field must be mapped. */
export const isDefineSchemaValid = ({ dynamic, fields }: MappingEditorValue): boolean =>
  dynamic || fields.some((field) => !isTimestampField(field) && field.name.trim() && field.type);

/**
 * Runs the Additional settings field rules against values, limited to the fields that step shows for them.
 * Keep in sync with the `rules` of the fields rendered by `CreateDatasetAdditionalSettings`.
 */
const isSettingsStepValid = (values: CreateDatasetFormValues): boolean => {
  const { settings } = values;
  const isCsvOrTsv = settings.format === 'csv' || settings.format === 'tsv';
  const results = [
    validatePartitionPath(settings.partition_path, values),
    ...(errorModeAllowsBudget(settings.error_mode)
      ? [validateMaxErrors(settings.max_errors), validateMaxErrorRatio(settings.max_error_ratio)]
      : []),
    ...(isCsvOrTsv
      ? [
          validateSkipRows(settings.skip_rows),
          validateDelimiter(settings.delimiter),
          validateQuoteCharacter(settings.quote),
          validateEscapeCharacter(settings.escape),
          ...CSV_CHARACTER_SETTING_NAMES.map((name) =>
            validateDistinctCsvCharacter(name)(settings[name], values)
          ),
        ]
      : []),
  ];
  return results.every((result) => result === true);
};

const isMappingStepValid = ({ mappings }: CreateDatasetFormValues): boolean =>
  isTimestampFieldValid(mappings) && isDefineSchemaValid(mappings);

/**
 * The skippable steps (those between the first and last) whose rules pass for `values`, so a saved
 * dataset can be navigated freely without visiting each step first.
 */
export const getValidStepIds = (values: CreateDatasetFormValues): DatasetWizardStepId[] => [
  ...(isSettingsStepValid(values) ? (['settings'] as const) : []),
  ...(isMappingStepValid(values) ? (['mapping'] as const) : []),
];
