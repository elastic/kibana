/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceVars } from './use_service_settings';
import {
  AWS_REGION_OPTIONS,
  FIELD_CONFIG,
  REGION_FIELD_NAMES,
  getFlyoutFields,
  getMandatoryBooleanFields,
  getRegionFieldName,
  getRequiredTextFields,
  hasTransportChoice,
} from './field_config';
import type { TransportType } from './field_config';
import { SignalTypeBadge } from '../services_step/signal_type_badge';

interface ServiceSettingsFlyoutProps {
  service: AwsServiceMatrixEntry;
  config: ServiceVars;
  globalRegion: string;
  onApply: (fields: Record<string, string>, transport: TransportType | null) => void;
  onClose: () => void;
}

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

export function ServiceSettingsFlyout({
  service,
  config,
  globalRegion,
  onApply,
  onClose,
}: ServiceSettingsFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId();
  const [draft, setDraft] = useState<Record<string, string>>({ ...config.vars });
  const [draftTransport, setDraftTransport] = useState<TransportType | null>(config.trigger);

  const [regionsRows, setRegionsRows] = useState<string[]>(() => {
    const parts = (config.vars.regions ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [''];
  });

  const syncRegionsToDraft = (rows: string[]) => {
    setDraft((prev) => ({ ...prev, regions: rows.filter(Boolean).join(',') }));
  };

  const handleRegionRowChange = (index: number, value: string) => {
    const next = regionsRows.map((r, i) => (i === index ? value : r));
    setRegionsRows(next);
    syncRegionsToDraft(next);
  };

  const handleRegionRowAdd = () => setRegionsRows((prev) => [...prev, '']);

  const handleRegionRowRemove = (index: number) => {
    const next = regionsRows.filter((_, i) => i !== index);
    const final = next.length > 0 ? next : [''];
    setRegionsRows(final);
    syncRegionsToDraft(final);
  };

  const hasTransport = hasTransportChoice(service);
  const requiredTextFields = getRequiredTextFields(service, draftTransport);
  const requiredTextFieldSet = new Set(requiredTextFields);
  const flyoutFields = getFlyoutFields(service, draftTransport);
  const regionField = getRegionFieldName(service, draftTransport);
  const otherFlyoutFields = flyoutFields.filter(
    (f) => !REGION_FIELD_NAMES.has(f) && !requiredTextFieldSet.has(f)
  );
  const mandatoryBoolFields = getMandatoryBooleanFields(service, draftTransport);

  const regionValue = draft[regionField]?.trim() || globalRegion;
  const selectedRegionOption = regionValue ? [{ label: regionValue }] : [];

  const handleRegionChange = (selected: Array<{ label: string }>) => {
    setDraft((prev) => ({ ...prev, [regionField]: selected[0]?.label ?? '' }));
  };

  const handleRegionCreate = (searchValue: string) => {
    setDraft((prev) => ({ ...prev, [regionField]: searchValue }));
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setDraft((prev) => ({ ...prev, [fieldName]: value }));
  };

  const getBoolValue = (fieldName: string): boolean => {
    if (draft[fieldName] !== undefined) return draft[fieldName] === 'true';
    return FIELD_CONFIG[fieldName]?.defaultValue === true;
  };

  const handleApply = () => {
    onApply(draft, draftTransport);
  };

  const anyRequiredEmpty = requiredTextFields.some((f) => !(draft[f] ?? '').trim());

  const getFieldLabel = (fieldName: string): string => {
    const meta = FIELD_CONFIG[fieldName];
    if (!meta) return fieldName;
    if (hasTransport && meta.transport === 'aws-s3') return `[S3] ${meta.label}`;
    if (hasTransport && meta.transport === 'aws-cloudwatch') return `[CloudWatch] ${meta.label}`;
    return meta.label;
  };

  return (
    <EuiFlyout
      size="s"
      ownFocus
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj="serviceSettingsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m" id={flyoutTitleId}>
              <h2>{service.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SignalTypeBadge signalType={service.signalType} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
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
                onChange={(id) => setDraftTransport(id as TransportType)}
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
                <EuiText
                  size="s"
                  color="danger"
                  data-test-subj="serviceSettingsFlyout-requiredHint"
                >
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
                    onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                    placeholder={meta.placeholder}
                    isInvalid={isInvalid}
                    data-test-subj={`serviceSettingsFlyout-field-${fieldName}`}
                  />
                </EuiFormRow>
              );
            })}
          </>
        )}

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.regionOverride.label', {
            defaultMessage: 'AWS Region (override)',
          })}
          helpText={i18n.translate(
            'xpack.ingestHub.serviceSettingsStep.flyout.regionOverride.helpText',
            { defaultMessage: 'Overrides the global region for this service only.' }
          )}
          isInvalid={!regionValue.trim()}
        >
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            options={AWS_REGION_OPTIONS}
            selectedOptions={selectedRegionOption}
            onChange={handleRegionChange}
            onCreateOption={handleRegionCreate}
            isInvalid={!regionValue.trim()}
            customOptionText='Use "{searchValue}" as region'
          />
        </EuiFormRow>

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
                          onChange={(e) => handleRegionRowChange(index, e.target.value)}
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
                              onClick={() => handleRegionRowRemove(index)}
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
                  <EuiButtonEmpty size="xs" iconType="plusInCircle" onClick={handleRegionRowAdd}>
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
                onChange={(e) => handleFieldChange(fieldName, e.target.value)}
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
                    onChange={(e) =>
                      handleFieldChange(fieldName, e.target.checked ? 'true' : 'false')
                    }
                  />
                </EuiFormRow>
              );
            })}
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="serviceSettingsFlyout-closeButton">
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.flyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleApply} data-test-subj="serviceSettingsFlyout-saveButton">
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.flyout.saveButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
