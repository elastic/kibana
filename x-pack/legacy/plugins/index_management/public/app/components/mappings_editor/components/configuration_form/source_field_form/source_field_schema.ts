/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { FormSchema, FIELD_TYPES } from '../../../shared_imports';
import { ComboBoxOption } from '../../../types';
import { SourceField } from '../../../reducer';

const fieldPathComboBoxConfig = {
  helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.sourceFieldPathComboBoxHelpText', {
    defaultMessage: 'Accepts a path to the field, including wildcards.',
  }),
  type: FIELD_TYPES.COMBO_BOX,
  defaultValue: [],
  serializer: (options: ComboBoxOption[]): string[] => options.map(({ label }) => label),
  deserializer: (values: string[]): ComboBoxOption[] => values.map(value => ({ label: value })),
};

export const sourceFieldSchema: FormSchema<SourceField> = {
  enabled: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.sourceFieldLabel', {
      defaultMessage: 'Enable source field',
    }),
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: (value?: boolean) => {
      // ES will only store a false value. It will accept true, but then throw it away.
      if (value === undefined) {
        return true;
      }
      return value;
    },
    serializer: (value: boolean) => {
      if (value === true) {
        // Source is true by default so the API doesn't need us to be explicit.
        return undefined;
      }
      return value;
    },
  },
  includes: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.excludeSourceFieldsLabel', {
      defaultMessage: 'Include fields',
    }),
    ...fieldPathComboBoxConfig,
  },
  excludes: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.includeSourceFieldsLabel', {
      defaultMessage: 'Exclude fields',
    }),
    ...fieldPathComboBoxConfig,
  },
};
