/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiCode,
  EuiFieldNumber,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { DynamicSettings, CertStateThresholds } from '../../../common/runtime_types';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';

interface ChangedValues {
  heartbeatIndices?: string;
  certThresholds?: Partial<CertStateThresholds>;
}

export type OnFieldChangeType = (changedValues: ChangedValues) => void;

export interface SettingsFormProps {
  loading: boolean;
  onChange: OnFieldChangeType;
  formFields: DynamicSettings | null;
  fieldErrors: any;
  isDisabled: boolean;
}

export const CertificateExpirationForm: React.FC<SettingsFormProps> = ({
  loading,
  onChange,
  formFields,
  fieldErrors,
  isDisabled,
}) => (
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
            id="xpack.uptime.sourceConfiguration.expirationThreshold"
            defaultMessage="Expiration/Age Thresholds"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.uptime.sourceConfiguration.certificateThresholdDescription"
          defaultMessage="Change the threshold for displaying and alerting on certificate errors. Note, this will affect any configured alerts"
        />
      }
    >
      <EuiFormRow
        describedByIds={['errorState']}
        error={fieldErrors?.certificatesThresholds?.errorState}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.expirationThresholdDefaultValue"
            defaultMessage="The default value is {defaultValue}"
            values={{
              defaultValue: (
                <EuiCode>{DYNAMIC_SETTINGS_DEFAULTS.certThresholds.expiration}</EuiCode>
              ),
            }}
          />
        }
        isInvalid={!!fieldErrors?.certificatesThresholds?.errorState}
        label={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.errorStateLabel"
            defaultMessage="Expiration threshold"
          />
        }
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              data-test-subj={`expiration-threshold-input-${loading ? 'loading' : 'loaded'}`}
              fullWidth
              disabled={isDisabled}
              isLoading={loading}
              value={formFields?.certThresholds?.expiration || ''}
              onChange={e =>
                onChange({
                  certThresholds: {
                    expiration: Number(e.target.value),
                  },
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiText>
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.ageLimit.units.days"
                defaultMessage="Days"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow
        describedByIds={['warningState']}
        error={fieldErrors?.certificatesThresholds?.warningState}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.ageThresholdDefaultValue"
            defaultMessage="The default value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>{DYNAMIC_SETTINGS_DEFAULTS.certThresholds.age}</EuiCode>,
            }}
          />
        }
        isInvalid={!!fieldErrors?.certificatesThresholds?.warningState}
        label={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.warningStateLabel"
            defaultMessage="Age limit"
          />
        }
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              data-test-subj={`age-threshold-input-${loading ? 'loading' : 'loaded'}`}
              fullWidth
              disabled={isDisabled}
              isLoading={loading}
              value={formFields?.certThresholds?.age || ''}
              onChange={e =>
                onChange({
                  certThresholds: { age: Number(e.currentTarget.value) },
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiText>
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.ageLimit.units.days"
                defaultMessage="Days"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  </>
);
