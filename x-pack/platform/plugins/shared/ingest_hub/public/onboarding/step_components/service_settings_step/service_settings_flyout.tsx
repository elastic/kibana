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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AwsServiceMatrixEntry, DataStreamInfo } from '../../aws_service_matrix';
import { makeDsView } from '../../aws_service_matrix';
import { shouldDefaultCollectS3Logs } from './field_config';
import type { ServiceVars, ServiceDataStreamVars } from './use_service_settings';
import { isServiceConfigIncomplete } from './use_service_settings';
import { ServiceFieldsForm } from './service_fields_form';
import {
  InstanceNamespaceField,
  getNamespaceError,
  supportsNamespace,
} from './instance_namespace_field';
import { SignalTypeBadge } from '../services_step/signal_type_badge';

function getDefaultDsInputs(
  dsInfo: DataStreamInfo | undefined,
  isSingleDs: boolean,
  serviceDefaultEnabledInputs?: string[]
): string[] {
  if (isSingleDs) {
    // For single-DS services, prefer the entry-level defaultEnabledInputs (which may have been
    // overridden in the static matrix, e.g. ECF OTel entries default to S3 only). Fall back to
    // all DS inputs when no override is set (original behaviour for non-ECF services).
    return serviceDefaultEnabledInputs?.length ? serviceDefaultEnabledInputs : dsInfo?.inputs ?? [];
  }
  return dsInfo?.defaultEnabledInputs ?? [];
}

/** Persist `collect_s3_logs: true` for S3 inputs given a bucket ARN, so the switch shows the real behaviour. */
function withCollectS3Defaults(
  service: AwsServiceMatrixEntry,
  draftByDs: Record<string, ServiceDataStreamVars>
): Record<string, ServiceDataStreamVars> {
  const result: Record<string, ServiceDataStreamVars> = {};
  for (const [dsId, dsVars] of Object.entries(draftByDs)) {
    const dsView = makeDsView(service, dsId);
    const varsByInput = { ...dsVars.varsByInput };
    for (const input of Object.keys(varsByInput)) {
      if (shouldDefaultCollectS3Logs(dsView, input, varsByInput[input])) {
        varsByInput[input] = { ...varsByInput[input], collect_s3_logs: 'true' };
      }
    }
    result[dsId] = { ...dsVars, varsByInput };
  }
  return result;
}

interface ServiceSettingsFlyoutProps {
  service: AwsServiceMatrixEntry;
  config: ServiceVars;
  globalRegion: string;
  isNamespaceLocked?: boolean;
  /** What an empty namespace resolves to for the chosen deployment method, when it is known. */
  resolvedEmptyNamespace?: string;
  onApply: (
    varsByDataStream: Record<string, ServiceDataStreamVars>,
    enabledDataStreams: string[],
    namespace: string
  ) => void;
  onClose: () => void;
}

export function ServiceSettingsFlyout({
  service,
  config,
  globalRegion,
  isNamespaceLocked = false,
  resolvedEmptyNamespace,
  onApply,
  onClose,
}: ServiceSettingsFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId();

  const isSingleDs = service.dataStreams.length === 1;

  // Seed the S3 toggle on open too, so a stored bucket ARN shows the switch on before any save.
  const [draftByDs, setDraftByDs] = useState<Record<string, ServiceDataStreamVars>>(() =>
    withCollectS3Defaults(service, { ...config.varsByDataStream })
  );
  const [namespace, setNamespace] = useState(config.namespace ?? '');
  const showNamespace = supportsNamespace(service);
  const isNamespaceInvalid = showNamespace && !!getNamespaceError(namespace);

  const enabledDataStreams = service.dataStreams.filter((dsId) => {
    const dsVars = draftByDs[dsId];
    if (dsVars) return dsVars.enabledInputs.length > 0;
    return (
      getDefaultDsInputs(
        service.varDefsByDataStream?.[dsId],
        isSingleDs,
        service.defaultEnabledInputs
      ).length > 0
    );
  });
  // Same rule as the Step 2 / Step 3 gates, so Save cannot persist a config those would reject.
  const isDraftIncomplete = isServiceConfigIncomplete(service, {
    enabledDataStreams,
    varsByDataStream: draftByDs,
    namespace,
  });

  const handleApply = () => {
    onApply(withCollectS3Defaults(service, draftByDs), enabledDataStreams, namespace);
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
            <SignalTypeBadge signalTypes={service.signalTypes} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {showNamespace && (
          <>
            <InstanceNamespaceField
              namespace={namespace}
              onChange={setNamespace}
              isLocked={isNamespaceLocked}
              resolvedEmptyNamespace={resolvedEmptyNamespace}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <ServiceFieldsForm
          service={service}
          varsByDataStream={draftByDs}
          globalRegion={globalRegion}
          onFieldChange={(dsId, input, fieldName, value) =>
            setDraftByDs((prev) => {
              const dsInfo = service.varDefsByDataStream?.[dsId];
              const existing = prev[dsId] ?? {
                enabledInputs: getDefaultDsInputs(dsInfo, isSingleDs, service.defaultEnabledInputs),
                varsByInput: {},
              };
              return withCollectS3Defaults(service, {
                ...prev,
                [dsId]: {
                  ...existing,
                  varsByInput: {
                    ...existing.varsByInput,
                    [input]: { ...(existing.varsByInput[input] ?? {}), [fieldName]: value },
                  },
                },
              });
            })
          }
          onInputToggle={(dsId, input, enabled) =>
            setDraftByDs((prev) => {
              const dsInfo = service.varDefsByDataStream?.[dsId];
              const existing = prev[dsId] ?? {
                enabledInputs: getDefaultDsInputs(dsInfo, isSingleDs, service.defaultEnabledInputs),
                varsByInput: {},
              };
              return {
                ...prev,
                [dsId]: {
                  ...existing,
                  enabledInputs: enabled
                    ? [...existing.enabledInputs, input]
                    : existing.enabledInputs.filter((i) => i !== input),
                },
              };
            })
          }
        />
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
            <EuiButton
              fill
              onClick={handleApply}
              isDisabled={isNamespaceInvalid || isDraftIncomplete}
              data-test-subj="serviceSettingsFlyout-saveButton"
            >
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
