/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { FormSchema, fieldValidators } from '../../shared_imports';

const { isJsonField } = fieldValidators;

export const templatesFormSchema: FormSchema<{ dynamicTemplates: any[] }> = {
  dynamicTemplates: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.templates.dynamicTemplatesEditorLabel', {
      defaultMessage: 'Dynamic templates data',
    }),
    validations: [
      {
        validator: isJsonField(
          i18n.translate('xpack.idxMgmt.mappingsEditor.templates.dynamicTemplatesEditorJsonError', {
            defaultMessage: 'The dynamic templates JSON is not valid.',
          })
        ),
      },
    ],
  },
};
