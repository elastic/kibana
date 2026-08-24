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
import { makeDsView } from '../../aws_service_matrix';
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
import type { ServiceDataStreamVars } from './use_service_settings';

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
  varsByDataStream: Record<string, ServiceDataStreamVars>;
  enabledDataStreams: string[];
  globalRegion: string;
  onFieldChange: (dsId: string, input: string, fieldName: string, value: string) => void;
  onDataStreamToggle: (dsId: string, enabled: boolean) => void;
  onInputToggle: (dsId: string, input: string, enabled: boolean) => void;
}

// ECF trigger vars reference a "Collect logs via S3 Bucket" toggle that doesn't exist in
// this UI. Strip the manifest description so the misleading help text isn't shown.
const ECF_TRIGGER_VARS = new Set(['bucket_arn', 'log_group_arn']);

function VarField({
  service,
  activeInput,
  fieldName,
  draft,
  onFieldChange,
  forceShowErrors,
}: {
  service: AwsServiceMatrixEntry;
  activeInput: string;
  fieldName: string;
  draft: Record<string, Record<string, string>>;
  onFieldChange: (input: string, fieldName: string, value: string) => void;
  forceShowErrors?: boolean;
}) {
  const meta = resolveFieldMeta(service, activeInput, fieldName);
  if (!meta) return null;
  const value = toTyped(draft[activeInput]?.[fieldName], meta);
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
    ? { ...meta.def, description: undefined, multi: true, required: true }
    : meta.def;
  return (
    <div data-test-subj={`serviceSettingsFlyout-${activeInput}-field-${fieldName}`}>
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazyPackagePolicyInputVarField
          varDef={varDef}
          value={value}
          onChange={(next) => onFieldChange(activeInput, fieldName, toDraft(next))}
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
  varsByInput,
  globalRegion,
  onFieldChange,
}: {
  service: AwsServiceMatrixEntry;
  activeInput: string;
  varsByInput: Record<string, Record<string, string>>;
  globalRegion: string;
  onFieldChange: (input: string, fieldName: string, value: string) => void;
}) {
  const [isShowingAdvanced, setIsShowingAdvanced] = useState(false);

  const allConfigFields = [...(service.requiredConfig ?? []), ...(service.optionalConfig ?? [])];
  const regionFieldName = getRegionFieldName(service, activeInput);
  const regionMeta = allConfigFields.includes(regionFieldName)
    ? resolveFieldMeta(service, activeInput, regionFieldName)
    : undefined;

  const requiredTextFields = getRequiredTextFields(service, activeInput);
  const requiredTextFieldSet = new Set(requiredTextFields);
  const flyoutFields = getFlyoutFields(service, activeInput);
  const otherFlyoutFields = flyoutFields.filter(
    (f) => !REGION_FIELD_NAMES.has(f) && !requiredTextFieldSet.has(f)
  );
  const requiredBoolFields = getRequiredBooleanFields(service, activeInput);

  const isAdvanced = (fieldName: string) => {
    const meta = resolveFieldMeta(service, activeInput, fieldName);
    return meta ? isAdvancedVar(meta.def) : false;
  };

  const primaryBoolFields = requiredBoolFields.filter((f) => !isAdvanced(f));
  const advancedBoolFields = requiredBoolFields.filter(isAdvanced);
  const primaryOtherFields = otherFlyoutFields.filter((f) => !isAdvanced(f));
  const advancedOtherFields = otherFlyoutFields.filter(isAdvanced);

  const hasAdvancedOptions = advancedBoolFields.length > 0 || advancedOtherFields.length > 0;

  const draft = varsByInput[activeInput] ?? {};
  const anyRequiredEmpty = requiredTextFields.some((f) => {
    const meta = resolveFieldMeta(service, activeInput, f);
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
              data-test-subj={`serviceSettingsFlyout-${activeInput}-field-${regionFieldName}`}
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
                activeInput={activeInput}
                fieldName={fieldName}
                draft={varsByInput}
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
                activeInput={activeInput}
                fieldName={fieldName}
                draft={varsByInput}
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
                activeInput={activeInput}
                fieldName={fieldName}
                draft={varsByInput}
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
                    activeInput={activeInput}
                    fieldName={fieldName}
                    draft={varsByInput}
                    onFieldChange={onFieldChange}
                  />
                </React.Fragment>
              ))}
              {advancedOtherFields.map((fieldName, i) => (
                <React.Fragment key={fieldName}>
                  {(i > 0 || advancedBoolFields.length > 0) && <EuiSpacer size="m" />}
                  <VarField
                    service={service}
                    activeInput={activeInput}
                    fieldName={fieldName}
                    draft={varsByInput}
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
  varsByDataStream,
  enabledDataStreams,
  globalRegion,
  onFieldChange,
  onDataStreamToggle,
  onInputToggle,
}: ServiceFieldsFormProps) {
  const dataStreams = service.dataStreams ?? [];
  const multiDs = dataStreams.length > 1;

  if (dataStreams.length === 0) return null;

  if (!multiDs) {
    // Single data-stream service — render inputs directly, no DS-level toggle.
    const dsId = dataStreams[0];
    const dsView = makeDsView(service, dsId);
    const dsInputs = dsView.inputs ?? [];
    const dsVars = varsByDataStream[dsId] ?? { enabledInputs: [], varsByInput: {} };
    const multiInput = dsInputs.length > 1;

    if (!multiInput) {
      const singleInput = dsInputs[0] ?? null;
      return singleInput ? (
        <InputVarFields
          service={dsView}
          activeInput={singleInput}
          varsByInput={dsVars.varsByInput}
          globalRegion={globalRegion}
          onFieldChange={(inp, field, val) => onFieldChange(dsId, inp, field, val)}
        />
      ) : null;
    }

    return (
      <>
        {dsInputs.map((input, idx) => {
          const isEnabled = dsVars.enabledInputs.includes(input);
          return (
            <React.Fragment key={input}>
              {idx > 0 && <EuiHorizontalRule margin="m" />}
              <EuiSwitch
                label={getInputDisplayLabel(input)}
                checked={isEnabled}
                onChange={(e) => onInputToggle(dsId, input, e.target.checked)}
                data-test-subj={`serviceSettingsFlyout-inputToggle-${input}`}
              />
              {isEnabled && (
                <>
                  <EuiSpacer size="m" />
                  <InputVarFields
                    service={dsView}
                    activeInput={input}
                    varsByInput={dsVars.varsByInput}
                    globalRegion={globalRegion}
                    onFieldChange={(inp, field, val) => onFieldChange(dsId, inp, field, val)}
                  />
                </>
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  }

  // Multi-data-stream service — render per-DS sections with DS-level toggles.
  return (
    <>
      {dataStreams.map((dsId, dsIdx) => {
        const dsView = makeDsView(service, dsId);
        const dsInfo = service.varDefsByDataStream?.[dsId];
        const dsVars = varsByDataStream[dsId] ?? { enabledInputs: [], varsByInput: {} };
        const isDsEnabled = enabledDataStreams.includes(dsId);
        const dsInputs = dsView.inputs ?? [];
        const multiInput = dsInputs.length > 1;

        return (
          <React.Fragment key={dsId}>
            {dsIdx > 0 && <EuiHorizontalRule margin="m" />}
            <EuiSwitch
              label={dsInfo?.title ?? dsId}
              checked={isDsEnabled}
              onChange={(e) => onDataStreamToggle(dsId, e.target.checked)}
              data-test-subj={`serviceSettingsFlyout-dsToggle-${dsId}`}
            />
            {isDsEnabled && (
              <>
                <EuiSpacer size="m" />
                {multiInput ? (
                  dsInputs.map((input, inputIdx) => {
                    const isInputEnabled = dsVars.enabledInputs.includes(input);
                    return (
                      <React.Fragment key={input}>
                        {inputIdx > 0 && <EuiHorizontalRule margin="s" />}
                        <EuiSwitch
                          label={getInputDisplayLabel(input)}
                          checked={isInputEnabled}
                          onChange={(e) => onInputToggle(dsId, input, e.target.checked)}
                          data-test-subj={`serviceSettingsFlyout-inputToggle-${dsId}-${input}`}
                        />
                        {isInputEnabled && (
                          <>
                            <EuiSpacer size="m" />
                            <InputVarFields
                              service={dsView}
                              activeInput={input}
                              varsByInput={dsVars.varsByInput}
                              globalRegion={globalRegion}
                              onFieldChange={(inp, field, val) =>
                                onFieldChange(dsId, inp, field, val)
                              }
                            />
                          </>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : dsInputs[0] ? (
                  <InputVarFields
                    service={dsView}
                    activeInput={dsInputs[0]}
                    varsByInput={dsVars.varsByInput}
                    globalRegion={globalRegion}
                    onFieldChange={(inp, field, val) => onFieldChange(dsId, inp, field, val)}
                  />
                ) : null}
              </>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
