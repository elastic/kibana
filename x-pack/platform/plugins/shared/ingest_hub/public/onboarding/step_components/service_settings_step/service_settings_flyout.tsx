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
import type { TransportType } from './field_config';
import { ServiceFieldsForm } from './service_fields_form';
import { SignalTypeBadge } from '../services_step/signal_type_badge';

interface ServiceSettingsFlyoutProps {
  service: AwsServiceMatrixEntry;
  config: ServiceVars;
  onApply: (fields: Record<string, string>, transport: TransportType | null) => void;
  onClose: () => void;
}

export function ServiceSettingsFlyout({
  service,
  config,
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

  const handleFieldChange = (fieldName: string, value: string) => {
    setDraft((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleApply = () => {
    onApply(draft, draftTransport);
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
          draftTransport={draftTransport}
          regionsRows={regionsRows}
          onFieldChange={handleFieldChange}
          onTransportChange={setDraftTransport}
          onRegionRowChange={handleRegionRowChange}
          onRegionRowAdd={handleRegionRowAdd}
          onRegionRowRemove={handleRegionRowRemove}
          showTransportPrefix
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
