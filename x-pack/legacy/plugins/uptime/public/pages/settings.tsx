/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiForm,
  EuiTitle,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiCode,
  EuiPanel,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const SettingsPage = ({}) => {
  return (
    <EuiPanel>
      <EuiForm>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.indicesSectionTitle"
              defaultMessage="Indices"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiDescribedFormGroup
          idAria="uptimeIndices"
          title={
            <h4>
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.uptimeIndicesTitle"
                defaultMessage="Uptime indices"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.uptimeIndicesDescription"
              defaultMessage="Index pattern for matching indices that contain Heartbeat data"
            />
          }
        >
          <EuiFormRow
            describedByIds={['uptimeIndices']}
            // TODO handle errors in input data
            // error={metricAliasFieldProps.error}
            fullWidth
            helpText={
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.uptimeIndicesRecommendedValue"
                defaultMessage="The recommended value is {defaultValue}"
                values={{
                  // TODO: make this the value returned from the API.
                  defaultValue: <EuiCode>heartbeat-8-*</EuiCode>,
                }}
              />
            }
            // TODO handle what's invalid
            // isInvalid={metricAliasFieldProps.isInvalid}
            label={
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.uptimeIndicesLabel"
                defaultMessage="Uptime indices"
              />
            }
          >
            <EuiFieldText
              data-test-subj="uptimeIndicesInput"
              fullWidth
              // disabled={isLoading}
              // readOnly={readOnly}
              // isLoading={isLoading}
              // {...uptimeAliasFieldProps}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiForm>
    </EuiPanel>
  );
};
