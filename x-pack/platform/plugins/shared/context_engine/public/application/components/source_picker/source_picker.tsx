/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useCanReadConnectors } from '../../hooks/use_can_read_connectors';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { useHasRendered } from '../../hooks/use_has_rendered';
import { createIndexEsqlQuery, hasSelectedEsqlQuery } from '../../utils/sources';
import { SelectedSourcesList } from '../selected_sources_list';
import { SourceTypePanel } from '../source_type_panel';
import { ConnectorsTab } from './connectors_tab';
import { ElasticsearchSourcesPanel } from './elasticsearch_sources_panel';
import type { SelectedSource } from './types';

interface SourcePickerProps {
  selectedSources: SelectedSource[];
  onChange: (sources: SelectedSource[]) => void;
  disabled?: boolean;
}

export const SourcePicker = ({
  selectedSources,
  onChange,
  disabled = false,
}: SourcePickerProps) => {
  const hasRendered = useHasRendered();

  const esqlSources = useMemo(
    () => selectedSources.filter((source) => source.type === 'esql'),
    [selectedSources]
  );
  const connectorSources = useMemo(
    () => selectedSources.filter((source) => source.type === 'connector'),
    [selectedSources]
  );

  const canReadConnectors = useCanReadConnectors();
  const { connectorNameById, connectorActionTypeById } = useDataConnectors({
    enabled: connectorSources.length > 0 && canReadConnectors,
  });

  const selectedConnectorIds = useMemo(
    () => connectorSources.map((source) => source.value),
    [connectorSources]
  );

  const addEsqlSource = (query: string) => {
    if (hasSelectedEsqlQuery(selectedSources, query)) {
      return;
    }
    onChange([{ type: 'esql', id: query, label: query, value: query }, ...selectedSources]);
  };

  const addIndexSource = (indexName: string) => {
    addEsqlSource(createIndexEsqlQuery(indexName));
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
    onChange(checked ? [{ type: 'connector', id, label: name, value: id }, ...others] : others);
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
      <SourceTypePanel
        badgeCount={esqlSources.length}
        data-test-subj="contextElasticsearchDataPanel"
        title={
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.tabs.elasticsearch"
            defaultMessage="Elasticsearch data"
          />
        }
      >
        <ElasticsearchSourcesPanel
          selectedSources={selectedSources}
          onAddIndex={addIndexSource}
          onAddEsql={addEsqlSource}
          disabled={disabled}
        />
        {esqlSources.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <SelectedSourcesList
              sources={esqlSources}
              connectorNameById={connectorNameById}
              connectorActionTypeById={connectorActionTypeById}
              onRemove={removeSource}
              disabled={disabled}
              animateOnMount={hasRendered}
            />
          </>
        )}
      </SourceTypePanel>

      <EuiSpacer size="m" />

      <SourceTypePanel
        badgeCount={connectorSources.length}
        data-test-subj="contextConnectorsPanel"
        title={
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.tabs.connectors"
            defaultMessage="Connectors"
          />
        }
      >
        <ConnectorsTab
          selectedConnectorIds={selectedConnectorIds}
          onToggle={toggleConnectorSource}
          disabled={disabled}
        />
        {connectorSources.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <SelectedSourcesList
              sources={connectorSources}
              connectorNameById={connectorNameById}
              connectorActionTypeById={connectorActionTypeById}
              onRemove={removeSource}
              disabled={disabled}
              animateOnMount={hasRendered}
            />
          </>
        )}
      </SourceTypePanel>
    </div>
  );
};
