/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode } from '@elastic/eui';

import { FormSchema, fieldValidators } from '../../shared_imports';
import { MappingsTemplates } from '../../reducer';

const { isJsonField } = fieldValidators;

export const templatesFormSchema: FormSchema<MappingsTemplates> = {
  dynamicTemplates: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.templates.dynamicTemplatesEditorLabel', {
      defaultMessage: 'Dynamic templates data',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.idxMgmt.mappingsEditor.templates.dynamicTemplatesEditorHelpText"
        defaultMessage="Use JSON format: {code}"
        values={{
          code: (
            <EuiCode>
              {JSON.stringify([
                {
                  my_template_name: {
                    mapping: {},
                  },
                },
              ])}
            </EuiCode>
          ),
        }}
      />
    ),
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
