/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';

import { UseField, Field, FormDataProvider } from '../../../shared_imports';
import { NormalizedField } from '../../../types';
import { getFieldConfig } from '../../../lib';
import { PARAMETERS_OPTIONS } from '../../../constants';
import { EditFieldFormRow } from '../fields/edit_field';

interface Props {
  field: NormalizedField;
  defaultToggleValue: boolean;
}

export const TermVectorParameter = ({ field, defaultToggleValue }: Props) => {
  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.termVectorFieldTitle', {
        defaultMessage: 'Set term vector',
      })}
      description={i18n.translate('xpack.idxMgmt.mappingsEditor.termVectorFieldDescription', {
        defaultMessage: 'Store term vectors for an analyzed field.',
      })}
      defaultToggleValue={defaultToggleValue}
    >
      <FormDataProvider pathsToWatch="term_vector">
        {formData => (
          <>
            <UseField
              path="term_vector"
              config={getFieldConfig('term_vector')}
              component={Field}
              componentProps={{
                euiFieldProps: {
                  options: PARAMETERS_OPTIONS.term_vector,
                  fullWidth: true,
                },
              }}
            />

            {formData.term_vector === 'with_positions_offsets' && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut color="warning">
                  <p>
                    {i18n.translate('xpack.idxMgmt.mappingsEditor.termVectorFieldWarningMessage', {
                      defaultMessage:
                        'Setting "With positions and offsets" will double the size of a field’s index.',
                    })}
                  </p>
                </EuiCallOut>
              </>
            )}
          </>
        )}
      </FormDataProvider>
    </EditFieldFormRow>
  );
};
