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
  EuiFieldNumber,
  EuiTitle,
  EuiSpacer,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { defaultDynamicSettings } from '../../../common/runtime_types';
import { selectDynamicSettings } from '../../state/selectors';

export const CertificateExpirationForm: React.FC = ({
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
            id="xpack.uptime.sourceConfiguration.certificationSectionTitle"
            defaultMessage="Certificate Expiration"
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
                defaultValue: <EuiCode>{defaultDynamicSettings.heartbeatIndices}</EuiCode>,
              }}
            />
          }
          isInvalid={!!fieldErrors?.heartbeatIndices}
          label={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.heartbeatIndicesLabel"
              defaultMessage="Error state"
            />
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem grow={2}>
              <EuiFieldNumber
                data-test-subj={`heartbeat-indices-input-${dss.loading ? 'loading' : 'loaded'}`}
                fullWidth
                disabled={isDisabled}
                isLoading={dss.loading}
                value={formFields?.heartbeatIndices || ''}
                onChange={(event: any) => onChange('heartbeatIndices', event.currentTarget.value)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiSelect />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiFormRow
          describedByIds={['heartbeatIndices']}
          error={fieldErrors?.heartbeatIndices}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.heartbeatIndicesDefaultValue"
              defaultMessage="The default value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>{defaultDynamicSettings.heartbeatIndices}</EuiCode>,
              }}
            />
          }
          isInvalid={!!fieldErrors?.heartbeatIndices}
          label={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.heartbeatIndicesLabel"
              defaultMessage="Warning state"
            />
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem grow={2}>
              <EuiFieldNumber
                data-test-subj={`heartbeat-indices-input-${dss.loading ? 'loading' : 'loaded'}`}
                fullWidth
                disabled={isDisabled}
                isLoading={dss.loading}
                value={formFields?.heartbeatIndices || ''}
                onChange={(event: any) => onChange('heartbeatIndices', event.currentTarget.value)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiSelect />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
