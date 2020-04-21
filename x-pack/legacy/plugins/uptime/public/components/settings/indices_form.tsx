/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useSelector } from 'react-redux';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiCode,
  EuiFieldText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { selectDynamicSettings } from '../../state/selectors';
import { SettingsFormProps } from './certificate_form';

export const IndicesForm: React.FC<SettingsFormProps> = ({
  onChange,
  formFields,
  fieldErrors,
  isDisabled,
}) => {
  const dss = useSelector(selectDynamicSettings);

  return (
    <>
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
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.heartbeatIndicesTitle"
              defaultMessage="Uptime indices"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.heartbeatIndicesDescription"
            defaultMessage="Index pattern for matching indices that contain Heartbeat data"
          />
        }
      >
        <EuiFormRow
          describedByIds={['heartbeatIndices']}
          error={fieldErrors?.heartbeatIndices}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.heartbeatIndicesDefaultValue"
              defaultMessage="The default value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>{dss.settings.heartbeatIndices}</EuiCode>,
              }}
            />
          }
          isInvalid={!!fieldErrors?.heartbeatIndices}
          label={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.heartbeatIndicesLabel"
              defaultMessage="Heartbeat indices"
            />
          }
        >
          <EuiFieldText
            data-test-subj={`heartbeat-indices-input-${dss.loading ? 'loading' : 'loaded'}`}
            fullWidth
            disabled={isDisabled}
            isLoading={dss.loading}
            value={formFields?.heartbeatIndices || ''}
            onChange={(event: any) => onChange({ heartbeatIndices: event.currentTarget.value })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
