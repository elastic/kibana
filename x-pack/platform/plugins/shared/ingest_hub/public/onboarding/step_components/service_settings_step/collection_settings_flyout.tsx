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
  EuiButtonIcon,
  EuiCallOut,
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
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceConfig } from './use_service_settings';
import {
  AWS_REGION_OPTIONS,
  FIELD_CONFIG,
  getFlyoutFields,
  getMandatoryBooleanFields,
} from './field_config';

interface CollectionSettingsFlyoutProps {
  service: AwsServiceMatrixEntry;
  config: ServiceConfig;
  globalRegion: string;
  onApply: (fields: Record<string, string>) => void;
  onClose: () => void;
}

const REGION_FIELD_NAMES = new Set(['region', 'region_name', 'aws_region']);

function getRegionFieldName(
  service: AwsServiceMatrixEntry,
  activeTransport: string | null
): string {
  const rc = service.requiredConfig ?? [];
  if (activeTransport === 'aws-s3' && rc.includes('region')) return 'region';
  if (activeTransport === 'aws-cloudwatch' && rc.includes('region_name')) return 'region_name';
  if (rc.includes('aws_region')) return 'aws_region';
  return 'aws_region';
}

export function CollectionSettingsFlyout({
  service,
  config,
  globalRegion,
  onApply,
  onClose,
}: CollectionSettingsFlyoutProps) {
  const [draft, setDraft] = useState<Record<string, string>>({ ...config.fields });

  const [regionsRows, setRegionsRows] = useState<string[]>(() => {
    const parts = (config.fields.regions ?? '')
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

  const flyoutFields = getFlyoutFields(service, config.activeTransport);
  const regionField = getRegionFieldName(service, config.activeTransport);
  const otherFlyoutFields = flyoutFields.filter((f) => !REGION_FIELD_NAMES.has(f));
  const mandatoryBoolFields = getMandatoryBooleanFields(service, config.activeTransport);

  const regionValue = draft[regionField] ?? globalRegion;
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
    onApply(draft);
    onClose();
  };

  return (
    <EuiFlyout size="m" ownFocus onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.ingestHub.serviceSettingsStep.flyout.title"
              defaultMessage="Collection settings — {serviceName}"
              values={{ serviceName: service.name }}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCallOut
          title={i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.callout.title', {
            defaultMessage: 'Sensible defaults applied',
          })}
          color="success"
          iconType="checkInCircleFilled"
        >
          <p>
            <FormattedMessage
              id="xpack.ingestHub.serviceSettingsStep.flyout.callout.body"
              defaultMessage="{awsRegion} overrides the global region for this service only. {regions} is an optional filter to restrict collection to specific regions."
              values={{
                awsRegion: <strong>AWS Region</strong>,
                regions: <strong>Regions</strong>,
              }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.ingestHub.serviceSettingsStep.flyout.advancedHeading"
              defaultMessage="ADVANCED COLLECTION SETTINGS"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFormRow
          label={i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.regionOverride.label', {
            defaultMessage: 'AWS Region (override)',
          })}
        >
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            options={AWS_REGION_OPTIONS}
            selectedOptions={selectedRegionOption}
            onChange={handleRegionChange}
            onCreateOption={handleRegionCreate}
            customOptionText={i18n.translate(
              'xpack.ingestHub.serviceSettingsStep.flyout.regionComboBox.customOption',
              { defaultMessage: 'Use "{searchValue}" as region' }
            )}
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
                              iconType="minusInCircle"
                              color="danger"
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
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.flyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleApply}>
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.flyout.applyButton"
                defaultMessage="Apply"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
