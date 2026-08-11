/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import {
  FIELD_CONFIG,
  REGION_FIELD_NAMES,
  getFlyoutFields,
  getMandatoryBooleanFields,
  getRequiredTextFields,
  hasTransportChoice,
} from './field_config';
import type { TransportType } from './field_config';

const TRANSPORT_OPTIONS = [
  {
    id: 'aws-s3' as TransportType,
    label: i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.transport.s3', {
      defaultMessage: 'S3',
    }),
  },
  {
    id: 'aws-cloudwatch' as TransportType,
    label: i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.transport.cloudwatch', {
      defaultMessage: 'CloudWatch',
    }),
  },
];

export interface ServiceFieldsFormProps {
  service: AwsServiceMatrixEntry;
  draft: Record<string, string>;
  draftTransport: TransportType | null;
  regionsRows: string[];
  onFieldChange: (fieldName: string, value: string) => void;
  onTransportChange: (transport: TransportType) => void;
  onRegionRowChange: (index: number, value: string) => void;
  onRegionRowAdd: () => void;
  onRegionRowRemove: (index: number) => void;
  /** When true, show [S3] / [CloudWatch] prefixes on transport-specific field labels */
  showTransportPrefix?: boolean;
}

export function ServiceFieldsForm({
  service,
  draft,
  draftTransport,
  regionsRows,
  onFieldChange,
  onTransportChange,
  onRegionRowChange,
  onRegionRowAdd,
  onRegionRowRemove,
  showTransportPrefix = false,
}: ServiceFieldsFormProps) {
  const hasTransport = hasTransportChoice(service);
  const requiredTextFields = getRequiredTextFields(service, draftTransport);
  const requiredTextFieldSet = new Set(requiredTextFields);
  const flyoutFields = getFlyoutFields(service, draftTransport);
  const otherFlyoutFields = flyoutFields.filter(
    (f) => !REGION_FIELD_NAMES.has(f) && !requiredTextFieldSet.has(f)
  );
  const mandatoryBoolFields = getMandatoryBooleanFields(service, draftTransport);

  const anyRequiredEmpty = requiredTextFields.some((f) => !(draft[f] ?? '').trim());

  const getBoolValue = (fieldName: string): boolean => {
    if (draft[fieldName] !== undefined) return draft[fieldName] === 'true';
    return FIELD_CONFIG[fieldName]?.defaultValue === true;
  };

  const getFieldLabel = (fieldName: string): string => {
    const meta = FIELD_CONFIG[fieldName];
    if (!meta) return fieldName;
    if (showTransportPrefix && hasTransport && meta.transport === 'aws-s3')
      return `[S3] ${meta.label}`;
    if (showTransportPrefix && hasTransport && meta.transport === 'aws-cloudwatch')
      return `[CloudWatch] ${meta.label}`;
    return meta.label;
  };

  return (
    <>
      {hasTransport && (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate(
                'xpack.ingestHub.serviceSettingsStep.flyout.transport.legend',
                { defaultMessage: 'Transport type' }
              )}
              options={TRANSPORT_OPTIONS}
              idSelected={draftTransport ?? 'aws-s3'}
              onChange={(id) => onTransportChange(id as TransportType)}
              buttonSize="compressed"
              color="primary"
              data-test-subj="serviceSettingsFlyout-transportToggle"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {requiredTextFields.length > 0 && (
        <>
          <EuiSpacer size="m" />
          {anyRequiredEmpty && (
            <>
              <EuiText size="s" color="danger" data-test-subj="serviceSettingsFlyout-requiredHint">
                <p>
                  <FormattedMessage
                    id="xpack.ingestHub.serviceSettingsStep.flyout.requiredHint"
                    defaultMessage="Complete the required fields below before continuing."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="s" />
            </>
          )}
          {requiredTextFields.map((fieldName) => {
            const meta = FIELD_CONFIG[fieldName];
            if (!meta) return null;
            const value = draft[fieldName] ?? '';
            const isInvalid = value.trim() === '';
            return (
              <EuiFormRow
                key={fieldName}
                display="rowCompressed"
                label={getFieldLabel(fieldName)}
                isInvalid={isInvalid}
                error={
                  isInvalid
                    ? i18n.translate(
                        'xpack.ingestHub.serviceSettingsStep.flyout.requiredField.error',
                        { defaultMessage: 'This field is required.' }
                      )
                    : undefined
                }
              >
                <EuiFieldText
                  compressed
                  value={value}
                  onChange={(e) => onFieldChange(fieldName, e.target.value)}
                  placeholder={meta.placeholder}
                  isInvalid={isInvalid}
                  data-test-subj={`serviceSettingsFlyout-field-${fieldName}`}
                />
              </EuiFormRow>
            );
          })}
        </>
      )}

      {otherFlyoutFields.map((fieldName) => {
        const meta = FIELD_CONFIG[fieldName];
        if (!meta) return null;
        if (fieldName === 'regions') {
          return (
            <EuiFormRow key="regions" label={meta.label} helpText={meta.helpText}>
              <div>
                {regionsRows.map((row, index) => (
                  <EuiFlexGroup
                    key={index}
                    gutterSize="xs"
                    alignItems="center"
                    responsive={false}
                    style={{ marginBottom: 4 }}
                  >
                    <EuiFlexItem>
                      <EuiFieldText
                        compressed
                        value={row}
                        onChange={(e) => onRegionRowChange(index, e.target.value)}
                        placeholder={meta.placeholder}
                      />
                    </EuiFlexItem>
                    {regionsRows.length > 1 && (
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          content={i18n.translate(
                            'xpack.ingestHub.serviceSettingsStep.flyout.regions.removeRow',
                            { defaultMessage: 'Remove region' }
                          )}
                          disableScreenReaderOutput
                        >
                          <EuiButtonIcon
                            iconType="cross"
                            onClick={() => onRegionRowRemove(index)}
                            aria-label={i18n.translate(
                              'xpack.ingestHub.serviceSettingsStep.flyout.regions.removeRow',
                              { defaultMessage: 'Remove region' }
                            )}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                ))}
                <EuiButtonEmpty size="xs" iconType="plusCircle" onClick={onRegionRowAdd}>
                  <FormattedMessage
                    id="xpack.ingestHub.serviceSettingsStep.flyout.regions.addRow"
                    defaultMessage="Add region"
                  />
                </EuiButtonEmpty>
              </div>
            </EuiFormRow>
          );
        }
        return (
          <EuiFormRow key={fieldName} label={meta.label} helpText={meta.helpText}>
            <EuiFieldText
              value={draft[fieldName] ?? ''}
              onChange={(e) => onFieldChange(fieldName, e.target.value)}
              placeholder={meta.placeholder}
            />
          </EuiFormRow>
        );
      })}

      {mandatoryBoolFields.length > 0 && (
        <>
          <EuiSpacer size="m" />
          {mandatoryBoolFields.map((fieldName) => {
            const meta = FIELD_CONFIG[fieldName];
            if (!meta) return null;
            return (
              <EuiFormRow key={fieldName} display="rowCompressed" helpText={meta.helpText}>
                <EuiSwitch
                  label={meta.label}
                  checked={getBoolValue(fieldName)}
                  onChange={(e) => onFieldChange(fieldName, e.target.checked ? 'true' : 'false')}
                />
              </EuiFormRow>
            );
          })}
        </>
      )}
    </>
  );
}
