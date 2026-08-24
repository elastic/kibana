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
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceVars, ServiceDataStreamVars } from './use_service_settings';
import { ServiceFieldsForm } from './service_fields_form';
import { SignalTypeBadge } from '../services_step/signal_type_badge';

interface ServiceSettingsFlyoutProps {
  service: AwsServiceMatrixEntry;
  config: ServiceVars;
  globalRegion: string;
  onApply: (
    varsByDataStream: Record<string, ServiceDataStreamVars>,
    enabledDataStreams: string[]
  ) => void;
  onClose: () => void;
}

export function ServiceSettingsFlyout({
  service,
  config,
  globalRegion,
  onApply,
  onClose,
}: ServiceSettingsFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId();

  const [draftByDs, setDraftByDs] = useState<Record<string, ServiceDataStreamVars>>(() => ({
    ...config.varsByDataStream,
  }));
  const [draftEnabledDataStreams, setDraftEnabledDataStreams] = useState<string[]>(
    config.enabledDataStreams
  );

  const handleApply = () => {
    onApply(draftByDs, draftEnabledDataStreams);
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
        <ServiceFieldsForm
          service={service}
          varsByDataStream={draftByDs}
          enabledDataStreams={draftEnabledDataStreams}
          globalRegion={globalRegion}
          onFieldChange={(dsId, input, fieldName, value) =>
            setDraftByDs((prev) => {
              const existing = prev[dsId] ?? { enabledInputs: [], varsByInput: {} };
              return {
                ...prev,
                [dsId]: {
                  ...existing,
                  varsByInput: {
                    ...existing.varsByInput,
                    [input]: { ...(existing.varsByInput[input] ?? {}), [fieldName]: value },
                  },
                },
              };
            })
          }
          onDataStreamToggle={(dsId, enabled) =>
            setDraftEnabledDataStreams((prev) =>
              enabled ? [...prev, dsId] : prev.filter((id) => id !== dsId)
            )
          }
          onInputToggle={(dsId, input, enabled) =>
            setDraftByDs((prev) => {
              const existing = prev[dsId] ?? { enabledInputs: [], varsByInput: {} };
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
