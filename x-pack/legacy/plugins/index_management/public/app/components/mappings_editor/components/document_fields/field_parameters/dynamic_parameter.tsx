/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { UseField, CheckBoxField } from '../../../shared_imports';
import { NormalizedField } from '../../../types';
import { EditFieldFormRow } from '../fields/edit_field';

interface Props {
  field: NormalizedField;
}

export const DynamicParameter = ({ field }: Props) => {
  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicParameter.fieldTitle', {
        defaultMessage: 'Dynamically add new properties',
      })}
      description={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.dynamicParameter.fieldDescription',
        {
          defaultMessage:
            'By default, fields can be added dynamically to objects within a document, just by indexing a document containing the new field.',
        }
      )}
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicDocLinkText', {
          defaultMessage: 'Dynamic documentation',
        }),
        href: documentationService.getParameterDocLink('dynamic')!,
      }}
      formFieldPath="dynamic"
    >
      {isOn =>
        isOn === false ? (
          <UseField
            path="dynamicStrict"
            config={{
              label: i18n.translate(
                'xpack.idxMgmt.mappingsEditor.dynamicStrictParameter.fieldTitle',
                {
                  defaultMessage:
                    'Throw an exception when the object contains an unmapped property',
                }
              ),
              helpText: i18n.translate(
                'xpack.idxMgmt.mappingsEditor.dynamicStrictParameter.fieldHelpText',
                {
                  defaultMessage:
                    'By default, unmapped properties will be silently ignored when dynamic mapping is disabled. Optionally, you can choose to throw an exception when an object contains an unmapped property.',
                }
              ),
            }}
            defaultValue={field.source.dynamic === 'strict'}
            component={CheckBoxField}
          />
        ) : null
      }
    </EditFieldFormRow>
  );
};
