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
import type { ServiceVars } from './use_service_settings';
import { ServiceFieldsForm } from './service_fields_form';
import { SignalTypeBadge } from '../services_step/signal_type_badge';

interface ServiceSettingsFlyoutProps {
  service: AwsServiceMatrixEntry;
  config: ServiceVars;
  globalRegion: string;
  onApply: (fields: Record<string, string>, enabledInputs: string[]) => void;
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
  const [draft, setDraft] = useState<Record<string, string>>({ ...config.vars });
  const [draftEnabledInputs, setDraftEnabledInputs] = useState<string[]>(config.enabledInputs);

  const handleFieldChange = (fieldName: string, value: string) => {
    setDraft((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleInputToggle = (input: string, enabled: boolean) => {
    setDraftEnabledInputs((prev) =>
      enabled ? [...prev, input] : prev.filter((i) => i !== input)
    );
  };

  const handleApply = () => {
    onApply(draft, draftEnabledInputs);
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
        <ServiceFieldsForm
          service={service}
          draft={draft}
          enabledInputs={draftEnabledInputs}
          globalRegion={globalRegion}
          onFieldChange={handleFieldChange}
          onInputToggle={handleInputToggle}
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
