/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { FormSchema, fieldValidators } from '../../shared_imports';
import { MappingsTemplates } from '../../reducer';

const { isJsonField } = fieldValidators;

export const templatesFormSchema: FormSchema<MappingsTemplates> = {
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
