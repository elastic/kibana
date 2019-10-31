/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';
import { PARAMETERS_OPTIONS } from '../../../constants';
import { getFieldConfig } from '../../../lib';
import { UseField, Field } from '../../../shared_imports';

interface Props {
  defaultToggleValue: boolean;
}

export const SimilarityParameter = ({ defaultToggleValue }: Props) => (
  <EditFieldFormRow
    title={
      <h3>
        {i18n.translate('xpack.idxMgmt.mappingsEditor.setSimilarityFieldTitle', {
          defaultMessage: 'Set similarity',
        })}
      </h3>
    }
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.setSimilarityFieldDescription', {
      defaultMessage: 'Which scoring algorithm or similarity should be used.',
    })}
    direction="column"
    toggleDefaultValue={defaultToggleValue}
  >
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <UseField
          path="similarity"
          config={getFieldConfig('similarity')}
          component={Field}
          componentProps={{
            euiFieldProps: {
              options: PARAMETERS_OPTIONS.similarity,
              style: { maxWidth: 300 },
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.idxMgmt.mappingsEditor.setSimilarityFieldDefaultDescription', {
            defaultMessage: 'Defaults to BM25.',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EditFieldFormRow>
);
