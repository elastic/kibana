/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo, useState } from 'react';
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
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InputFieldProps } from '@kbn/fleet-plugin/public';
import {
  DataStreamTypeSelector,
  LazyPackagePolicyInputVarField,
  useGetDataStreams,
} from '@kbn/fleet-plugin/public';
import { KibanaStyledComponentsThemeProvider } from '@kbn/react-kibana-context-styled';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { makeDsView } from '../../aws_service_matrix';
import {
  REGION_FIELD_NAMES,
  getFlyoutFields,
  getRegionFieldName,
  getRequiredTextFields,
  isAdvancedVar,
  resolveFieldMeta,
  toDraft,
  toTyped,
} from './field_config';
import type { ServiceDataStreamVars } from './use_service_settings';

function getInputDisplayLabel(input: string, inputTitles?: Record<string, string>): string {
  if (inputTitles?.[input]) return inputTitles[input];
  switch (input) {
    case 'httpjson':
    case 'cel':
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
  globalRegion: string;
  onFieldChange: (dsId: string, input: string, fieldName: string, value: string) => void;
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
  datastreams,
}: {
  service: AwsServiceMatrixEntry;
  activeInput: string;
  fieldName: string;
  draft: Record<string, Record<string, string>>;
  onFieldChange: (input: string, fieldName: string, value: string) => void;
  forceShowErrors?: boolean;
  datastreams?: InputFieldProps['datastreams'];
}) {
  const { colorMode } = useEuiTheme();
  const meta = resolveFieldMeta(service, activeInput, fieldName);
  if (!meta) return null;
  const value = toTyped(draft[activeInput]?.[fieldName], meta);

  if (fieldName === 'data_stream.type') {
    const selected = typeof value === 'string' ? value : (meta.def.default as string) ?? 'logs';
    return (
      <div data-test-subj={`serviceSettingsFlyout-${activeInput}-field-${fieldName}`}>
        <DataStreamTypeSelector
          value={selected}
          onChange={(id) => onFieldChange(activeInput, fieldName, id)}
          helpText={i18n.translate(
            'xpack.ingestHub.serviceSettingsStep.flyout.dataStreamType.help',
            {
              defaultMessage:
                "Select a data stream type for this policy. This setting changes the name of the integration's data stream.",
            }
          )}
        />
      </div>
    );
  }

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
  // KibanaStyledComponentsThemeProvider supplies the legacy styled-components EUI theme that
  // Fleet's var field accesses via props.theme.eui (e.g. FixedHeightDiv for yaml fields).
  return (
    <div data-test-subj={`serviceSettingsFlyout-${activeInput}-field-${fieldName}`}>
      <KibanaStyledComponentsThemeProvider darkMode={colorMode === 'DARK'}>
        <Suspense fallback={<EuiLoadingSpinner size="m" />}>
          <LazyPackagePolicyInputVarField
            varDef={varDef}
            value={value}
            onChange={(next) => onFieldChange(activeInput, fieldName, toDraft(next))}
            errors={errors}
            forceShowErrors={forceShowErrors}
            packageName={service.packageName}
            datastreams={datastreams}
          />
        </Suspense>
      </KibanaStyledComponentsThemeProvider>
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
  // data_stream.dataset is only present on OTel input-package services. useGetDataStreams cannot
  // be called conditionally (Rules of Hooks), so the fetch always fires — only the derived
  // value is guarded to avoid building a sorted list for every ECS-format flyout.
  const needsDatastreams = allConfigFields.includes('data_stream.dataset');
  const { data: dataStreamsData } = useGetDataStreams();
  const datastreams = useMemo(() => {
    if (!needsDatastreams) return undefined;
    const all = dataStreamsData?.data_streams ?? [];
    // Mirror Fleet's sortDatastreamsByDataset: package's own streams first, then alphabetical.
    return [...all].sort((a, b) => {
      const aOwn = a.dataset.startsWith(service.packageName ?? '') ? 0 : 1;
      const bOwn = b.dataset.startsWith(service.packageName ?? '') ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return a.dataset.localeCompare(b.dataset);
    });
  }, [dataStreamsData, service.packageName, needsDatastreams]);
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
  const isAdvanced = (fieldName: string) => {
    const meta = resolveFieldMeta(service, activeInput, fieldName);
    return meta ? isAdvancedVar(meta.def) : false;
  };

  // Collect ALL bool fields from both required and optional config — getRequiredBooleanFields
  // only covers show_user:true bools from requiredConfig, missing optional bools like
  // "Enable request tracing" (show_user:false in optionalConfig).
  const allBoolFields = allConfigFields.filter((f) => {
    const meta = resolveFieldMeta(service, activeInput, f);
    return meta?.isBool ?? false;
  });
  const primaryBoolFields = allBoolFields.filter((f) => !isAdvanced(f));
  const advancedBoolFields = allBoolFields.filter(isAdvanced);
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
                datastreams={datastreams}
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
                datastreams={datastreams}
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
                datastreams={datastreams}
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
              <EuiSpacer size="s" />
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
  globalRegion,
  onFieldChange,
  onInputToggle,
}: ServiceFieldsFormProps) {
  const { euiTheme } = useEuiTheme();
  const dataStreams = service.dataStreams ?? [];
  const multiDs = dataStreams.length > 1;

  if (dataStreams.length === 0) return null;

  if (!multiDs) {
    // Single data-stream service — render input toggles for all inputs.
    const dsId = dataStreams[0];
    const dsView = makeDsView(service, dsId);
    const dsInputs = dsView.inputs ?? [];
    const dsVars = varsByDataStream[dsId];

    return (
      <>
        {dsInputs.map((input, idx) => {
          const isEnabled = dsVars
            ? dsVars.enabledInputs.includes(input)
            : (dsView.defaultEnabledInputs?.length
                ? dsView.defaultEnabledInputs
                : dsInputs
              ).includes(input);
          return (
            <React.Fragment key={input}>
              {idx > 0 && <EuiHorizontalRule margin="m" />}
              <EuiSwitch
                label={getInputDisplayLabel(input, service.inputTitles)}
                checked={isEnabled}
                onChange={(e) => onInputToggle(dsId, input, e.target.checked)}
                data-test-subj={`serviceSettingsFlyout-inputToggle-${input}`}
              />
              {isEnabled && (
                <>
                  <EuiSpacer size="m" />
                  <div style={{ paddingLeft: euiTheme.size.xl }}>
                    <InputVarFields
                      service={dsView}
                      activeInput={input}
                      varsByInput={dsVars?.varsByInput ?? {}}
                      globalRegion={globalRegion}
                      onFieldChange={(inp, field, val) => onFieldChange(dsId, inp, field, val)}
                    />
                  </div>
                </>
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  }

  // Multi-data-stream service — flat input toggles; DS enabled state is derived from inputs.
  const inputItems = dataStreams.flatMap((dsId) => {
    const dsView = makeDsView(service, dsId);
    const dsInfo = service.varDefsByDataStream?.[dsId];
    const dsVars = varsByDataStream[dsId];
    const dsInputs = dsView.inputs ?? [];
    return dsInputs.map((input) => ({ dsId, input, dsView, dsInfo, dsVars, dsInputs }));
  });

  return (
    <>
      {inputItems.map(({ dsId, input, dsView, dsInfo, dsVars, dsInputs }, idx) => {
        const isInputEnabled = dsVars
          ? dsVars.enabledInputs.includes(input)
          : (dsInfo?.defaultEnabledInputs ?? []).includes(input);
        const label =
          dsInputs.length === 1
            ? dsInfo?.title ?? getInputDisplayLabel(input, service.inputTitles)
            : `${dsInfo?.title ?? dsId} — ${getInputDisplayLabel(input, service.inputTitles)}`;
        return (
          <React.Fragment key={`${dsId}-${input}`}>
            {idx > 0 && <EuiHorizontalRule margin="m" />}
            <EuiSwitch
              label={label}
              checked={isInputEnabled}
              onChange={(e) => onInputToggle(dsId, input, e.target.checked)}
              data-test-subj={`serviceSettingsFlyout-inputToggle-${dsId}-${input}`}
            />
            {isInputEnabled && (
              <>
                <EuiSpacer size="m" />
                <div style={{ paddingLeft: euiTheme.size.xl }}>
                  <InputVarFields
                    service={dsView}
                    activeInput={input}
                    varsByInput={dsVars?.varsByInput ?? {}}
                    globalRegion={globalRegion}
                    onFieldChange={(inp, field, val) => onFieldChange(dsId, inp, field, val)}
                  />
                </div>
              </>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
