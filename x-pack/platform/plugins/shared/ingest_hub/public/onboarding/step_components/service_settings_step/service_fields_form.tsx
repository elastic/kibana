/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiButtonGroup, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { LazyPackagePolicyInputVarField } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import {
  REGION_FIELD_NAMES,
  getFlyoutFields,
  getMandatoryBooleanFields,
  getRequiredBooleanFields,
  getRequiredTextFields,
  hasTransportChoice,
  resolveFieldMeta,
  toDraft,
  toTyped,
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
  onFieldChange: (fieldName: string, value: string) => void;
  onTransportChange: (transport: TransportType) => void;
}

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
  const effective = toTyped(draft[fieldName], meta);
  const errors =
    forceShowErrors && isRequired && typeof effective === 'string' && !effective.trim()
      ? [
          i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.requiredField.error', {
            defaultMessage: 'This field is required.',
          }),
        ]
      : null;
  return (
    <div data-test-subj={`serviceSettingsFlyout-field-${fieldName}`}>
      <Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazyPackagePolicyInputVarField
          varDef={meta.def}
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

export function ServiceFieldsForm({
  service,
  draft,
  draftTransport,
  onFieldChange,
  onTransportChange,
}: ServiceFieldsFormProps) {
  const hasTransport = hasTransportChoice(service);
  const requiredTextFields = getRequiredTextFields(service, draftTransport);
  const requiredBoolFields = getRequiredBooleanFields(service, draftTransport);
  const requiredTextFieldSet = new Set(requiredTextFields);
  const flyoutFields = getFlyoutFields(service, draftTransport);
  const otherFlyoutFields = flyoutFields.filter(
    (f) => !REGION_FIELD_NAMES.has(f) && !requiredTextFieldSet.has(f) && f !== 'regions'
  );
  const mandatoryBoolFields = getMandatoryBooleanFields(service, draftTransport);

  const anyRequiredEmpty = requiredTextFields.some((f) => {
    const meta = resolveFieldMeta(service, f);
    const effective = meta ? toTyped(draft[f], meta) : draft[f] ?? '';
    return typeof effective === 'string' && !effective.trim();
  });

  return (
    <>
      {hasTransport && (
        <EuiButtonGroup
          legend={i18n.translate('xpack.ingestHub.serviceSettingsStep.flyout.transport.legend', {
            defaultMessage: 'Transport type',
          })}
          options={TRANSPORT_OPTIONS}
          idSelected={draftTransport ?? 'aws-s3'}
          onChange={(id) => onTransportChange(id as TransportType)}
          buttonSize="compressed"
          color="primary"
          data-test-subj="serviceSettingsFlyout-transportToggle"
        />
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
          {requiredTextFields.map((fieldName) => (
            <VarField
              key={fieldName}
              service={service}
              fieldName={fieldName}
              draft={draft}
              onFieldChange={onFieldChange}
              forceShowErrors={anyRequiredEmpty}
            />
          ))}
        </>
      )}

      {requiredBoolFields.length > 0 && (
        <>
          <EuiSpacer size="m" />
          {requiredBoolFields.map((fieldName) => (
            <VarField
              key={fieldName}
              service={service}
              fieldName={fieldName}
              draft={draft}
              onFieldChange={onFieldChange}
            />
          ))}
        </>
      )}

      {otherFlyoutFields.map((fieldName) => (
        <VarField
          key={fieldName}
          service={service}
          fieldName={fieldName}
          draft={draft}
          onFieldChange={onFieldChange}
        />
      ))}

      {mandatoryBoolFields.length > 0 && (
        <>
          <EuiSpacer size="m" />
          {mandatoryBoolFields.map((fieldName) => (
            <VarField
              key={fieldName}
              service={service}
              fieldName={fieldName}
              draft={draft}
              onFieldChange={onFieldChange}
            />
          ))}
        </>
      )}
    </>
  );
}
