/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { NormalizedField } from '../../../../types';
import { UseField, Field } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { PARAMETERS_OPTIONS } from '../../../../constants';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

interface Props {
  field: NormalizedField;
}

export const TextType = React.memo(({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <EditFieldFormRow
          title={<h3>Store field value</h3>}
          description="This is description text."
          formFieldPath="store"
        />

        <EditFieldFormRow
          title={<h3>Searchable</h3>}
          description="This is description text."
          formFieldPath="index"
          direction="column"
        >
          {/* Index options */}
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <UseField
                path="index_options"
                config={getFieldConfig('index_options')}
                component={Field}
                componentProps={{
                  euiFieldProps: {
                    options: PARAMETERS_OPTIONS.index_options,
                    style: { maxWidth: 300 },
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                This is description text.
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EditFieldFormRow>

        <EditFieldFormRow
          title={<h3>Fielddata</h3>}
          description="This is description text."
          formFieldPath="fielddata"
          direction="column"
        >
          Field data frequency filter component here...
        </EditFieldFormRow>
      </EditFieldSection>

      <EuiSpacer size="m" />

      <AdvancedSettingsWrapper>
        <div>Here will come the advanced settings</div>
      </AdvancedSettingsWrapper>
    </>
  );
});
