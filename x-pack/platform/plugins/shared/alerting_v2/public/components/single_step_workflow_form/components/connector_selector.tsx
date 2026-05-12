/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useFetchConnectorsByType } from '../hooks/use_fetch_connectors_by_type';

interface ConnectorSelectorProps {
  connectorTypeId: string;
  value: string | null;
  onChange: (connectorId: string | null) => void;
}

export const ConnectorSelector = ({ connectorTypeId, value, onChange }: ConnectorSelectorProps) => {
  const { data: connectors = [], isLoading } = useFetchConnectorsByType({ connectorTypeId });

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      connectors.map((connector) => ({
        label: connector.name,
        value: connector.id,
        disabled: connector.isMissingSecrets,
      })),
    [connectors]
  );

  const selected = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    if (!value) return [];
    const match = connectors.find((c) => c.id === value);
    return [{ label: match?.name ?? value, value }];
  }, [connectors, value]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.singleStepWorkflow.connector.label', {
        defaultMessage: 'Connector',
      })}
      fullWidth
    >
      <EuiComboBox
        fullWidth
        singleSelection={{ asPlainText: true }}
        data-test-subj="singleStepWorkflowConnectorSelect"
        isLoading={isLoading}
        placeholder={i18n.translate('xpack.alertingV2.singleStepWorkflow.connector.placeholder', {
          defaultMessage: 'Select a connector',
        })}
        selectedOptions={selected}
        onChange={(next) => onChange(next[0]?.value ?? null)}
        options={options}
      />
    </EuiFormRow>
  );
};
