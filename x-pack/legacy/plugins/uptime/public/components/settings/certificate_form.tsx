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
              id="xpack.uptime.sourceConfiguration.stateThresholds"
              defaultMessage="Expiration State Thresholds"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.stateThresholdsDescription"
            defaultMessage="Set certificate expiration warning/error thresholds"
          />
        }
      >
        <EuiFormRow
          describedByIds={['errorState']}
          error={fieldErrors?.certificatesThresholds?.errorState}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.errorStateDefaultValue"
              defaultMessage="The default value is {defaultValue}"
              values={{
                defaultValue: (
                  <EuiCode>{defaultDynamicSettings.certificatesThresholds.errorState}</EuiCode>
                ),
              }}
            />
          }
          isInvalid={!!fieldErrors?.certificatesThresholds?.errorState}
          label={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.errorStateLabel"
              defaultMessage="Error state"
            />
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem grow={2}>
              <EuiFieldNumber
                data-test-subj={`error-state-threshold-input-${dss.loading ? 'loading' : 'loaded'}`}
                fullWidth
                disabled={isDisabled}
                isLoading={dss.loading}
                value={formFields?.certificatesThresholds?.errorState || ''}
                onChange={({ currentTarget: { value } }: any) =>
                  onChange(
                    'certificatesThresholds.errorState',
                    value === '' ? undefined : Number(value)
                  )
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiSelect options={[{ value: 'day', text: 'Days' }]} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiFormRow
          describedByIds={['warningState']}
          error={fieldErrors?.certificatesThresholds?.warningState}
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.warningStateDefaultValue"
              defaultMessage="The default value is {defaultValue}"
              values={{
                defaultValue: (
                  <EuiCode>{defaultDynamicSettings.certificatesThresholds.warningState}</EuiCode>
                ),
              }}
            />
          }
          isInvalid={!!fieldErrors?.certificatesThresholds.warningState}
          label={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.warningStateLabel"
              defaultMessage="Warning state"
            />
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem grow={2}>
              <EuiFieldNumber
                data-test-subj={`warning-state-threshold-input-${
                  dss.loading ? 'loading' : 'loaded'
                }`}
                fullWidth
                disabled={isDisabled}
                isLoading={dss.loading}
                value={formFields?.certificatesThresholds?.warningState || ''}
                onChange={(event: any) =>
                  onChange('certificatesThresholds.warningState', Number(event.currentTarget.value))
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiSelect options={[{ value: 'day', text: 'Days' }]} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
