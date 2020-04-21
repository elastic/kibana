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
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { DynamicSettings } from '../../../common/runtime_types';
import { selectDynamicSettings } from '../../state/selectors';

export type OnFieldChangeType = (changedValues: Partial<DynamicSettings>) => void;

export interface SettingsFormProps {
  onChange: OnFieldChangeType;
  formFields: DynamicSettings | null;
  fieldErrors: any;
  isDisabled: boolean;
}

export const CertificateExpirationForm: React.FC<SettingsFormProps> = ({
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
              id="xpack.uptime.sourceConfiguration.expirationThreshold"
              defaultMessage="Expiration/Age Thresholds"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.certificateThresholdDescription"
            defaultMessage="Set certificate expiration/age thresholds"
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
                defaultValue: <EuiCode>{dss.settings.certificatesThresholds?.expiration}</EuiCode>,
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
                data-test-subj={`expiration-threshold-input-${dss.loading ? 'loading' : 'loaded'}`}
                fullWidth
                disabled={isDisabled}
                isLoading={dss.loading}
                value={formFields?.certificatesThresholds?.expiration || ''}
                onChange={({ currentTarget: { value } }: any) =>
                  onChange({
                    certificatesThresholds: {
                      expiration: Number(value),
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
              id="xpack.uptime.sourceConfiguration.warningStateDefaultValue"
              defaultMessage="The default value is {defaultValue}"
              values={{
                defaultValue: <EuiCode>{dss.settings.certificatesThresholds?.age}</EuiCode>,
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
                data-test-subj={`age-threshold-input-${dss.loading ? 'loading' : 'loaded'}`}
                fullWidth
                disabled={isDisabled}
                isLoading={dss.loading}
                value={formFields?.certificatesThresholds?.age || ''}
                onChange={(event: any) =>
                  onChange({
                    certificatesThresholds: { age: Number(event.currentTarget.value) },
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
};
