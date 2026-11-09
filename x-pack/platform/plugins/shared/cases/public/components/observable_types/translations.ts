/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const TITLE = i18n.translate('xpack.cases.observableTypes.title', {
  defaultMessage: 'Observable types',
});

export const DESCRIPTION = i18n.translate('xpack.cases.observableTypes.description', {
  defaultMessage: 'Add observable types for customized case collaboration.',
});

export const NO_OBSERVABLE_TYPES = i18n.translate('xpack.cases.observableTypes.noObservableTypes', {
  defaultMessage: 'You do not have any observable types yet',
});

export const ADD_OBSERVABLE_TYPE = i18n.translate('xpack.cases.observableTypes.addObservableType', {
  defaultMessage: 'Add observable type',
});

export const OBSERVABLE_TYPE_LABEL = i18n.translate('xpack.cases.observableTypes.fieldLabel', {
  defaultMessage: 'Observable type label',
});

export const REQUIRED_FIELD = (fieldName: string): string =>
  i18n.translate('xpack.cases.observableTypes.requiredField', {
    values: { fieldName },
    defaultMessage: '{fieldName} is required.',
  });

export const DELETE_OBSERVABLE_TYPE_TITLE = (fieldName: string) =>
  i18n.translate('xpack.cases.observableTypes.deleteField', {
    values: { fieldName },
    defaultMessage: 'Delete observable type "{fieldName}"?',
  });

export const DELETE_OBSERVABLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.cases.observableTypes.deleteObservableTypeDescription',
  {
    defaultMessage: 'The observable type will be removed from all cases and data will be lost.',
  }
);

export const DELETE = i18n.translate('xpack.cases.observableTypes.options.Delete', {
  defaultMessage: 'Delete',
});

export const FIELDS_TABLE_CAPTION = i18n.translate(
  'xpack.cases.observableTypes.fieldsTableCaption',
  {
    defaultMessage: 'Alert fields that auto-extraction reads for this observable type',
  }
);

export const EXTRACT_COLUMN = i18n.translate('xpack.cases.observableTypes.extractColumn', {
  defaultMessage: 'Extract',
});

export const NO_FIELDS = i18n.translate('xpack.cases.observableTypes.noFields', {
  defaultMessage: 'No fields',
});

export const FIELD_NAME_PLACEHOLDER = i18n.translate(
  'xpack.cases.observableTypes.fieldNamePlaceholder',
  {
    defaultMessage: 'For example, user.id',
  }
);

export const FIELD_NAME_ARIA_LABEL = i18n.translate(
  'xpack.cases.observableTypes.fieldNameAriaLabel',
  {
    defaultMessage: 'Field name',
  }
);

export const EXTRACT_FROM_FIELD = (fieldName: string) =>
  i18n.translate('xpack.cases.observableTypes.extractFromField', {
    values: { fieldName },
    defaultMessage: 'Extract values from {fieldName}',
  });

export const REMOVE_FIELD = (fieldName: string) =>
  i18n.translate('xpack.cases.observableTypes.removeField', {
    values: { fieldName },
    defaultMessage: 'Remove {fieldName}',
  });

export const ADD_FIELD = i18n.translate('xpack.cases.observableTypes.addField', {
  defaultMessage: 'Add field',
});

export const EXCLUDED_VALUES_COLUMN = i18n.translate(
  'xpack.cases.observableTypes.excludedValuesColumn',
  {
    defaultMessage: 'Excluded values',
  }
);

export const EXCLUDED_VALUES_PLACEHOLDER = i18n.translate(
  'xpack.cases.observableTypes.excludedValuesPlaceholder',
  {
    defaultMessage: 'Type a value and press Enter',
  }
);

export const EXCLUDED_VALUES_FOR_FIELD = (fieldName: string) =>
  i18n.translate('xpack.cases.observableTypes.excludedValuesForField', {
    values: { fieldName },
    defaultMessage: 'Values to skip in {fieldName}',
  });

export const VALUE_PATTERN_LABEL = i18n.translate('xpack.cases.observableTypes.valuePatternLabel', {
  defaultMessage: 'Value pattern',
});

export const NO_VALUE_PATTERN = i18n.translate('xpack.cases.observableTypes.noValuePattern', {
  defaultMessage: 'None',
});

export const VALUE_PATTERN_HELP = i18n.translate('xpack.cases.observableTypes.valuePatternHelp', {
  defaultMessage: 'Optional. Only values that match this regular expression are extracted.',
});

export const INVALID_VALUE_PATTERN = i18n.translate(
  'xpack.cases.observableTypes.invalidValuePattern',
  {
    defaultMessage: 'Enter a valid regular expression.',
  }
);

export const RESET_TO_DEFAULTS = i18n.translate('xpack.cases.observableTypes.resetToDefaults', {
  defaultMessage: 'Reset to defaults',
});

export const OBSERVABLE_TYPES_TABLE_CAPTION = i18n.translate(
  'xpack.cases.observableTypes.observableTypesTableCaption',
  {
    defaultMessage: 'Observable types and the alert fields they are extracted from',
  }
);

export const NAME_COLUMN = i18n.translate('xpack.cases.observableTypes.nameColumn', {
  defaultMessage: 'Name',
});

export const FIELDS_COLUMN = i18n.translate('xpack.cases.observableTypes.fieldsColumn', {
  defaultMessage: 'Fields',
});

export const EXTRACTED_FIELDS_COUNT = (extracted: number, total: number) =>
  i18n.translate('xpack.cases.observableTypes.extractedFieldsCount', {
    values: { extracted, total },
    defaultMessage: '{extracted} of {total} extracted',
  });

export const SHOW_FIELDS = (typeLabel: string) =>
  i18n.translate('xpack.cases.observableTypes.showFields', {
    values: { typeLabel },
    defaultMessage: 'Show fields for {typeLabel}',
  });

export const HIDE_FIELDS = (typeLabel: string) =>
  i18n.translate('xpack.cases.observableTypes.hideFields', {
    values: { typeLabel },
    defaultMessage: 'Hide fields for {typeLabel}',
  });

export const MAX_OBSERVABLE_TYPES_LIMIT = (maxObservableTypesLimit: number) =>
  i18n.translate('xpack.cases.observableTypes.maxObservableTypesLimit', {
    values: { maxObservableTypesLimit },
    defaultMessage: 'Maximum number of {maxObservableTypesLimit} observable types reached.',
  });
