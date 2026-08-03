/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { getSourceDisplay } from '../source_display';
import { SourceRow } from '../source_row';
import { ConnectorsTab } from './connectors_tab';
import { EsqlTab } from './esql_tab';
import type { SelectedSource } from './types';

type TabId = 'esql' | 'connectors';

interface SourcePickerProps {
  selectedSources: SelectedSource[];
  onChange: (sources: SelectedSource[]) => void;
}

export const SourcePicker = ({ selectedSources, onChange }: SourcePickerProps) => {
  const [selectedTab, setSelectedTab] = useState<TabId>('esql');

  const hasSelectedConnectorSources = useMemo(
    () => selectedSources.some((source) => source.type === 'connector'),
    [selectedSources]
  );

  const {
    connectors,
    connectorNameById,
    isLoading: isLoadingConnectors,
    isError: isConnectorsError,
  } = useDataConnectors({
    enabled: selectedTab === 'connectors' || hasSelectedConnectorSources,
  });

  const selectedEsqlCount = useMemo(
    () => selectedSources.filter((source) => source.type === 'esql').length,
    [selectedSources]
  );

  const selectedConnectorIds = useMemo(
    () =>
      selectedSources.filter((source) => source.type === 'connector').map((source) => source.value),
    [selectedSources]
  );

  const addEsqlSource = (query: string) => {
    if (selectedSources.some((current) => current.type === 'esql' && current.id === query)) {
      return;
    }
    onChange([...selectedSources, { type: 'esql', id: query, label: query, value: query }]);
  };

  const toggleConnectorSource = ({
    id,
    name,
    checked,
  }: {
    id: string;
    name: string;
    checked: boolean;
  }) => {
    const others = selectedSources.filter(
      (current) => !(current.type === 'connector' && current.value === id)
    );
    onChange(checked ? [...others, { type: 'connector', id, label: name, value: id }] : others);
  };

  const removeSource = (source: SelectedSource) => {
    onChange(
      selectedSources.filter(
        (current) => !(current.type === source.type && current.id === source.id)
      )
    );
  };

  return (
    <div data-test-subj="contextSourcePicker">
      <EuiTabs data-test-subj="contextSourcePickerTabs">
        <EuiTab
          isSelected={selectedTab === 'esql'}
          onClick={() => setSelectedTab('esql')}
          prepend={<EuiIcon type="console" aria-hidden={true} />}
          append={
            selectedEsqlCount > 0 ? (
              <EuiNotificationBadge>{selectedEsqlCount}</EuiNotificationBadge>
            ) : undefined
          }
          data-test-subj="contextSourcePickerTab-esql"
        >
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.tabs.esql"
            defaultMessage="ES|QL"
          />
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === 'connectors'}
          onClick={() => setSelectedTab('connectors')}
          prepend={<EuiIcon type="plugs" aria-hidden={true} />}
          append={
            selectedConnectorIds.length > 0 ? (
              <EuiNotificationBadge>{selectedConnectorIds.length}</EuiNotificationBadge>
            ) : undefined
          }
          data-test-subj="contextSourcePickerTab-connectors"
        >
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.tabs.connectors"
            defaultMessage="Connectors"
          />
        </EuiTab>
      </EuiTabs>

      <EuiSpacer size="m" />

      {selectedTab === 'esql' && <EsqlTab onAdd={addEsqlSource} />}
      {selectedTab === 'connectors' && (
        <ConnectorsTab
          connectors={connectors}
          isLoading={isLoadingConnectors}
          isError={isConnectorsError}
          selectedConnectorIds={selectedConnectorIds}
          onToggle={toggleConnectorSource}
        />
      )}

      {selectedSources.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.selectedTitle"
                defaultMessage="Selected sources ({count})"
                values={{ count: selectedSources.length }}
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="s">
            {selectedSources.map((source, index) => {
              const { label, typeLabel, iconType, content } = getSourceDisplay(
                source.type,
                source.value,
                { connectorNameById }
              );
              return (
                <EuiFlexItem key={`${source.type}-${source.id}`}>
                  <SourceRow
                    label={label}
                    typeLabel={typeLabel}
                    iconType={iconType}
                    onRemove={() => removeSource(source)}
                    data-test-subj={`contextSelectedSource-${source.type}-${index}`}
                  >
                    {content}
                  </SourceRow>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};
