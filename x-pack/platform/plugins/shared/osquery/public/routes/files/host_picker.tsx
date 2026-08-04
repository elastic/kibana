/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiComboBox,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Agent } from '@kbn/fleet-plugin/common';
import { useAllAgents } from '../../agents/use_all_agents';
import { useHostCapability } from './use_host_capability';
import type { HostCapability } from './use_host_capability';

type HostPickerOption = EuiComboBoxOptionOption<string>;

interface HostPickerProps {
  onAgentSelected: (agentId: string, capability: HostCapability) => void;
}

const SINGLE_SELECTION = { asPlainText: true };

const HOST_PICKER_LABEL = i18n.translate('xpack.osquery.fileSystem.hostPicker.label', {
  defaultMessage: 'Select a host',
});

const HOST_PICKER_PLACEHOLDER = i18n.translate('xpack.osquery.fileSystem.hostPicker.placeholder', {
  defaultMessage: 'Search for a host...',
});

const HOST_PICKER_ARIA_LABEL = i18n.translate('xpack.osquery.fileSystem.hostPicker.ariaLabel', {
  defaultMessage: 'Host selector',
});

const HostPickerComponent: React.FC<HostPickerProps> = ({ onAgentSelected }) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [selectedOptions, setSelectedOptions] = useState<HostPickerOption[]>([]);

  const { data: agentList, isLoading: agentsLoading } = useAllAgents(searchValue, {
    perPage: 50,
  });

  const { data: capability, isLoading: capabilityLoading } = useHostCapability(selectedAgentId);

  const options = useMemo<HostPickerOption[]>(
    () =>
      (agentList?.agents ?? []).map((agent: Agent) => {
        const agentId = agent.local_metadata?.elastic?.agent?.id ?? '';
        const hostname =
          agent.local_metadata?.host?.hostname ??
          agent.local_metadata?.elastic?.agent?.id ??
          agentId;

        return { label: String(hostname), value: agentId };
      }),
    [agentList?.agents]
  );

  const handleChange = useCallback((selected: HostPickerOption[]) => {
    setSelectedOptions(selected);
    const agentId = selected[0]?.value ?? undefined;
    setSelectedAgentId(agentId);
  }, []);

  React.useEffect(() => {
    if (capability && selectedAgentId) {
      onAgentSelected(selectedAgentId, capability);
    }
  }, [capability, selectedAgentId, onAgentSelected]);

  return (
    <EuiFormRow label={HOST_PICKER_LABEL} fullWidth>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiComboBox
            placeholder={HOST_PICKER_PLACEHOLDER}
            aria-label={HOST_PICKER_ARIA_LABEL}
            singleSelection={SINGLE_SELECTION}
            options={options}
            selectedOptions={selectedOptions}
            onChange={handleChange}
            onSearchChange={setSearchValue}
            isLoading={agentsLoading}
            fullWidth
            isClearable
            data-test-subj="fileSystemHostPicker"
          />
        </EuiFlexItem>
        {capabilityLoading && selectedAgentId && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        )}
        {capability && !capabilityLoading && (
          <EuiFlexItem grow={false}>
            {capability.endpointCapable ? (
              <EuiBadge color="success">
                <FormattedMessage
                  id="xpack.osquery.fileSystem.hostPicker.endpointCapable"
                  defaultMessage="Endpoint"
                />
              </EuiBadge>
            ) : (
              <EuiBadge color="hollow">
                <FormattedMessage
                  id="xpack.osquery.fileSystem.hostPicker.osqueryOnly"
                  defaultMessage="Osquery only"
                />
              </EuiBadge>
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

export const HostPicker = React.memo(HostPickerComponent);

interface SelectedHostInfoProps {
  agentId: string;
  capability: HostCapability;
}

const ENDPOINT_BADGE = (
  <EuiBadge color="success">
    <FormattedMessage
      id="xpack.osquery.fileSystem.selectedHost.endpointCapable"
      defaultMessage="Endpoint"
    />
  </EuiBadge>
);

export const SelectedHostInfo: React.FC<SelectedHostInfoProps> = ({ agentId, capability }) => {
  const values = useMemo(
    () => ({
      agentId,
      endpointStatus: capability.endpointCapable ? ENDPOINT_BADGE : null,
    }),
    [agentId, capability.endpointCapable]
  );

  return (
    <EuiText size="s" color="subdued">
      <FormattedMessage
        id="xpack.osquery.fileSystem.selectedHost.info"
        defaultMessage="Host: {agentId} {endpointStatus}"
        values={values}
      />
    </EuiText>
  );
};
