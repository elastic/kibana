/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type {
  MappingEditorField,
  MappingEditorValue,
  MappingEditorValidationResult,
} from './mapping_editor';

const isFieldBlank = (field: MappingEditorField): boolean => {
  return (
    field.name.trim() === '' &&
    field.path.trim() === '' &&
    field.type === '' &&
    field.format.trim() === ''
  );
};

export const validateMappingEditorValue = (
  value: MappingEditorValue
): MappingEditorValidationResult => {
  const fieldErrorsById: MappingEditorValidationResult['fieldErrorsById'] = {};
  const globalErrors: string[] = [];

  const nonBlankFields = value.fields.filter((f) => !isFieldBlank(f));

  const trimmedNames = nonBlankFields.map((f) => ({ id: f.id, name: f.name.trim() }));
  const nameCounts = trimmedNames.reduce<Record<string, number>>((acc, { name }) => {
    if (!name) return acc;
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  for (const f of nonBlankFields) {
    const errors: MappingEditorValidationResult['fieldErrorsById'][string] = {};

    const name = f.name.trim();
    if (!name) {
      errors.name = i18n.translate('xpack.dataFederation.mappingEditor.validation.nameRequired', {
        defaultMessage: 'Name is required.',
      });
    } else if ((nameCounts[name] ?? 0) > 1) {
      errors.name = i18n.translate('xpack.dataFederation.mappingEditor.validation.nameDuplicate', {
        defaultMessage: 'Names must be unique.',
      });
    }

    if (!f.type) {
      errors.type = i18n.translate('xpack.dataFederation.mappingEditor.validation.typeRequired', {
        defaultMessage: 'Type is required.',
      });
    }

    const format = f.format.trim();
    const isDateLike = f.type === 'date' || f.type === 'date_nanos';
    if (format && !isDateLike) {
      errors.format = i18n.translate(
        'xpack.dataFederation.mappingEditor.validation.formatDateOnly',
        {
          defaultMessage: 'Format is only valid for type date.',
        }
      );
    }

    if (Object.keys(errors).length > 0) {
      fieldErrorsById[f.id] = errors;
    }
  }

  // Treat "mappings present" as having at least one fully-declared field (name + type)
  const declaredFieldCount = nonBlankFields.filter((f) => f.name.trim() && f.type).length;
  const hasAnyDeclaredMappings = declaredFieldCount > 0;

  const isValid = globalErrors.length === 0 && Object.keys(fieldErrorsById).length === 0;

  return {
    isValid,
    hasAnyDeclaredMappings,
    globalErrors,
    fieldErrorsById,
  };
};
