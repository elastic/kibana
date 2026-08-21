/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { LazyPackagePolicyInputVarField } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import {
  REGION_FIELD_NAMES,
  getFlyoutFields,
  getRegionFieldName,
  getRequiredBooleanFields,
  getRequiredTextFields,
  isAdvancedVar,
  resolveFieldMeta,
  toDraft,
  toTyped,
} from './field_config';

function getInputDisplayLabel(input: string): string {
  switch (input) {
    case 'httpjson':
      return i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.input.httpjson', {
        defaultMessage: 'Collect logs via API',
      });
    case 'aws-s3':
      return i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.input.s3', {
        defaultMessage: 'Collect logs via S3',
      });
    case 'aws-cloudwatch':
      return i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.input.cloudwatch', {
        defaultMessage: 'Collect logs via CloudWatch',
      });
    default:
      return input;
  }
}

export interface ServiceFieldsFormProps {
  service: AwsServiceMatrixEntry;
  draft: Record<string, string>;
  enabledInputs: string[];
  globalRegion: string;
  onFieldChange: (fieldName: string, value: string) => void;
  onInputToggle: (input: string, enabled: boolean) => void;
}

// ECF trigger vars reference a "Collect logs via S3 Bucket" toggle that doesn't exist in
// this UI. Strip the manifest description so the misleading help text isn't shown.
const ECF_TRIGGER_VARS = new Set(['bucket_arn', 'log_group_arn']);

function VarField({
  service,
  fieldName,
  draft,
  onFieldChange,
  forceShowErrors,
}: {
  service: AwsServiceMatrixEntry;
  fieldName: string;
  draft: Record<string, string>;
  onFieldChange: (fieldName: string, value: string) => void;
  forceShowErrors?: boolean;
}) {
  const meta = resolveFieldMeta(service, fieldName);
  if (!meta) return null;
  const value = toTyped(draft[fieldName], meta);
  const isRequired = !meta.isBool && (service.requiredConfig ?? []).includes(fieldName);
  const isEmpty = Array.isArray(value)
    ? value.length === 0
    : typeof value === 'string' && !value.trim();
  const errors =
    forceShowErrors && isRequired && isEmpty
      ? [
          i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.requiredField.error', {
            defaultMessage: 'This field is required.',
          }),
        ]
      : null;
  const varDef = ECF_TRIGGER_VARS.has(fieldName)
    ? { ...meta.def, description: undefined, multi: true }
    : meta.def;
  return (
    <div data-test-subj={`serviceSettingsFlyout-field-${fieldName}`}>
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazyPackagePolicyInputVarField
          varDef={varDef}
          value={value}
          onChange={(next) => onFieldChange(fieldName, toDraft(next))}
          errors={errors}
          forceShowErrors={forceShowErrors}
          packageName={service.packageName}
        />
      </Suspense>
    </div>
  );
}

function InputVarFields({
  service,
  activeInput,
  draft,
  globalRegion,
  onFieldChange,
}: {
  service: AwsServiceMatrixEntry;
  activeInput: string;
  draft: Record<string, string>;
  globalRegion: string;
  onFieldChange: (fieldName: string, value: string) => void;
}) {
  const [isShowingAdvanced, setIsShowingAdvanced] = useState(false);

  const allConfigFields = [...(service.requiredConfig ?? []), ...(service.optionalConfig ?? [])];
  const regionFieldName = getRegionFieldName(service, activeInput);
  const regionMeta = allConfigFields.includes(regionFieldName)
    ? resolveFieldMeta(service, regionFieldName)
    : undefined;

  const requiredTextFields = getRequiredTextFields(service, activeInput);
  const requiredTextFieldSet = new Set(requiredTextFields);
  const flyoutFields = getFlyoutFields(service, activeInput);
  const otherFlyoutFields = flyoutFields.filter(
    (f) => !REGION_FIELD_NAMES.has(f) && !requiredTextFieldSet.has(f)
  );
  const requiredBoolFields = getRequiredBooleanFields(service, activeInput);

  const isAdvanced = (fieldName: string) => {
    const meta = resolveFieldMeta(service, fieldName);
    return meta ? isAdvancedVar(meta.def) : false;
  };

  const primaryBoolFields = requiredBoolFields.filter((f) => !isAdvanced(f));
  const advancedBoolFields = requiredBoolFields.filter(isAdvanced);
  const primaryOtherFields = otherFlyoutFields.filter((f) => !isAdvanced(f));
  const advancedOtherFields = otherFlyoutFields.filter(isAdvanced);

  const hasAdvancedOptions = advancedBoolFields.length > 0 || advancedOtherFields.length > 0;

  const anyRequiredEmpty = requiredTextFields.some((f) => {
    const meta = resolveFieldMeta(service, f);
    const effective = meta ? toTyped(draft[f], meta) : draft[f] ?? '';
    if (Array.isArray(effective)) return effective.length === 0;
    return typeof effective === 'string' && !effective.trim();
  });

  return (
    <>
      {regionMeta && (
        <>
          <EuiFormRow
            label={
              regionMeta.def.title ??
              i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.region.label', {
                defaultMessage: 'Region',
              })
            }
          >
            <EuiFieldText
              value={globalRegion}
              disabled
              data-test-subj={`serviceSettingsFlyout-field-${regionFieldName}`}
            />
          </EuiFormRow>
          {requiredTextFields.length > 0 && <EuiSpacer size="m" />}
        </>
      )}
      {requiredTextFields.length > 0 && (
        <>
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
          {requiredTextFields.map((fieldName, i) => (
            <React.Fragment key={fieldName}>
              {i > 0 && <EuiSpacer size="m" />}
              <VarField
                service={service}
                fieldName={fieldName}
                draft={draft}
                onFieldChange={onFieldChange}
                forceShowErrors={anyRequiredEmpty}
              />
            </React.Fragment>
          ))}
        </>
      )}

      {primaryBoolFields.length > 0 && (
        <>
          <EuiSpacer size="m" />
          {primaryBoolFields.map((fieldName, i) => (
            <React.Fragment key={fieldName}>
              {i > 0 && <EuiSpacer size="m" />}
              <VarField
                service={service}
                fieldName={fieldName}
                draft={draft}
                onFieldChange={onFieldChange}
              />
            </React.Fragment>
          ))}
        </>
      )}

      {primaryOtherFields.length > 0 && (
        <>
          <EuiSpacer size="m" />
          {primaryOtherFields.map((fieldName, i) => (
            <React.Fragment key={fieldName}>
              {i > 0 && <EuiSpacer size="m" />}
              <VarField
                service={service}
                fieldName={fieldName}
                draft={draft}
                onFieldChange={onFieldChange}
              />
            </React.Fragment>
          ))}
        </>
      )}

      {hasAdvancedOptions && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType={isShowingAdvanced ? 'chevronSingleDown' : 'chevronSingleRight'}
                onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                flush="left"
                data-test-subj="serviceSettingsFlyout-advancedToggle"
              >
                <FormattedMessage
                  id="xpack.ingestHub.serviceSettingsStep.flyout.advancedOptions"
                  defaultMessage="Advanced options"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          {isShowingAdvanced && (
            <>
              {advancedBoolFields.map((fieldName, i) => (
                <React.Fragment key={fieldName}>
                  {i > 0 && <EuiSpacer size="m" />}
                  <VarField
                    service={service}
                    fieldName={fieldName}
                    draft={draft}
                    onFieldChange={onFieldChange}
                  />
                </React.Fragment>
              ))}
              {advancedOtherFields.map((fieldName, i) => (
                <React.Fragment key={fieldName}>
                  {(i > 0 || advancedBoolFields.length > 0) && <EuiSpacer size="m" />}
                  <VarField
                    service={service}
                    fieldName={fieldName}
                    draft={draft}
                    onFieldChange={onFieldChange}
                  />
                </React.Fragment>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

export function ServiceFieldsForm({
  service,
  draft,
  enabledInputs,
  globalRegion,
  onFieldChange,
  onInputToggle,
}: ServiceFieldsFormProps) {
  const inputs = service.inputs ?? [];
  const multiInput = inputs.length > 1;

  if (!multiInput) {
    // Single input — render vars directly with no toggle.
    const singleInput = inputs[0] ?? null;
    return singleInput ? (
      <InputVarFields
        service={service}
        activeInput={singleInput}
        draft={draft}
        globalRegion={globalRegion}
        onFieldChange={onFieldChange}
      />
    ) : null;
  }

  return (
    <>
      {inputs.map((input, idx) => {
        const isEnabled = enabledInputs.includes(input);
        return (
          <React.Fragment key={input}>
            {idx > 0 && <EuiHorizontalRule margin="m" />}
            <EuiSwitch
              label={getInputDisplayLabel(input)}
              checked={isEnabled}
              onChange={(e) => onInputToggle(input, e.target.checked)}
              data-test-subj={`serviceSettingsFlyout-inputToggle-${input}`}
            />
            {isEnabled && (
              <>
                <EuiSpacer size="m" />
                <InputVarFields
                  service={service}
                  activeInput={input}
                  draft={draft}
                  globalRegion={globalRegion}
                  onFieldChange={onFieldChange}
                />
              </>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
