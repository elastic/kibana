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
import { SelectOption } from '../../../types';
import { UseField, Field } from '../../../shared_imports';

interface Props {
  hasIndexOptions?: boolean;
  indexOptions?: SelectOption[];
}

export const IndexParameter = ({
  indexOptions = PARAMETERS_OPTIONS.index_options,
  hasIndexOptions = true,
}: Props) => (
  <EditFieldFormRow
    title={
      <h3>
        {i18n.translate('xpack.idxMgmt.mappingsEditor.searchableFieldTitle', {
          defaultMessage: 'Searchable',
        })}
      </h3>
    }
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.searchableFieldDescription', {
      defaultMessage: 'Allow the field to be searchable.',
    })}
    formFieldPath="index"
    direction="column"
  >
    {/* index_options */}
    {hasIndexOptions && (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <UseField
            path="index_options"
            config={getFieldConfig('index_options')}
            component={Field}
            componentProps={{
              euiFieldProps: {
                options: indexOptions,
                style: { maxWidth: 300 },
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.idxMgmt.mappingsEditor.indexOptionsFieldDescription', {
              defaultMessage: 'Information that should be stored in the index.',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    )}
  </EditFieldFormRow>
);
