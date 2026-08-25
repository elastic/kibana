/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_TAGS_FILTER_LABEL = i18n.translate('alertsFiltersForm.ruleTags.label', {
  defaultMessage: 'Rule tags',
});

export const RULE_TAGS_FILTER_PLACEHOLDER = i18n.translate(
  'alertsFiltersForm.ruleTags.placeholder',
  {
    defaultMessage: 'Select rule tags',
  }
);

export const RULE_TAGS_FILTER_NO_OPTIONS_PLACEHOLDER = i18n.translate(
  'alertsFiltersForm.ruleTags.noOptionsPlaceholder',
  {
    defaultMessage: 'No tags available',
  }
);

export const RULE_TAGS_LOAD_ERROR_MESSAGE = i18n.translate(
  'alertsFiltersForm.ruleTags.errorMessage',
  {
    defaultMessage: 'Cannot load available rule tags',
  }
);

export const RULE_TYPES_FILTER_LABEL = i18n.translate('alertsFiltersForm.ruleTypes.label', {
  defaultMessage: 'Rule types',
});

export const RULE_TYPES_FILTER_PLACEHOLDER = i18n.translate(
  'alertsFiltersForm.ruleTypes.placeholder',
  {
    defaultMessage: 'Select rule types',
  }
);

export const RULE_TYPES_FILTER_NO_OPTIONS_PLACEHOLDER = i18n.translate(
  'alertsFiltersForm.ruleTypes.noOptionsPlaceHolder',
  {
    defaultMessage: 'No rule types available',
  }
);

export const RULE_TYPES_LOAD_ERROR_MESSAGE = i18n.translate(
  'alertsFiltersForm.ruleTypes.errorMessage',
  {
    defaultMessage: 'Cannot load available rule types',
  }
);

export const SOLUTION_SELECTOR_ERROR_MESSAGE = i18n.translate(
  'alertsFiltersForm.solutionSelector.errorMessage',
  {
    defaultMessage: 'Cannot get the available solutions',
  }
);

export const DELETE_OPERAND_LABEL = i18n.translate('alertsFiltersForm.deleteOperand', {
  defaultMessage: 'Delete operand',
});

export const FORM_ITEM_OPTIONAL_CAPTION = i18n.translate(
  'alertsFiltersForm.formItem.optionalCaption',
  {
    defaultMessage: 'Optional',
  }
);

export const FORM_ITEM_FILTER_BY_LABEL = i18n.translate(
  'alertsFiltersForm.formItem.filterByLabel',
  {
    defaultMessage: 'Filter by',
  }
);

export const FORM_ITEM_FILTER_BY_PLACEHOLDER = i18n.translate(
  'alertsFiltersForm.formItem.filterByPlaceholder',
  {
    defaultMessage: 'Select filter type',
  }
);

export const ADD_OPERATION_LABEL = i18n.translate('alertsFiltersForm.addOperationLabel', {
  defaultMessage: 'Add boolean operation',
});

export const OR_OPERATOR = i18n.translate('alertsFiltersForm.orOperator', {
  defaultMessage: 'OR',
});

export const AND_OPERATOR = i18n.translate('alertsFiltersForm.andOperator', {
  defaultMessage: 'AND',
});

export const SOLUTION_SELECTOR_LABEL = i18n.translate('alertsFiltersForm.solutionSelectorLabel', {
  defaultMessage: 'Solution',
});

export const SOLUTION_SELECTOR_PLACEHOLDER = i18n.translate(
  'alertsFiltersForm.solutionSelectorPlaceholder',
  {
    defaultMessage: 'Select solution',
  }
);

export const getMaxFiltersNote = (max: number) =>
  i18n.translate('alertsFiltersForm.maxFiltersReached', {
    defaultMessage: 'Maximum number of {max} filters reached',
    values: { max },
  });

export const FILTER_TYPE_REQUIRED_ERROR_MESSAGE = i18n.translate(
  'alertsFiltersForm.filterTypeRequiredErrorMessage',
  {
    defaultMessage: 'Filter type is required',
  }
);

export const FILTER_VALUE_REQUIRED_ERROR_MESSAGE = i18n.translate(
  'alertsFiltersForm.filterValueRequiredErrorMessage',
  {
    defaultMessage: 'Filter value is required',
  }
);
