/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiSkeletonText, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useCanReadConnectors } from '../../hooks/use_can_read_connectors';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { useSaveAiIndexSources } from '../../hooks/use_save_ai_index_sources';
import { toSelectedSources } from '../../utils/sources';
import type { SelectedSource, SourceType } from '../source_picker';
import { SourceTypePanel } from '../source_type_panel';
import { AddSourceCard } from './add_source_card';
import { AddConnectorsPanel, AddElasticsearchDataPanel } from './add_sources_panels';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';
import { ConnectorSourceGrid } from './connector_source_grid';
import { ElasticsearchSourceList } from './elasticsearch_source_list';

interface SourcesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

export const SourcesPanel = ({ isLoading, aiIndex, onSaved, isManaged }: SourcesPanelProps) => {
  const { saveSources, isSaving } = useSaveAiIndexSources();
  const [addingKind, setAddingKind] = useState<SourceType | undefined>();

  const savedSources = useMemo(() => toSelectedSources(aiIndex?.sources ?? []), [aiIndex?.sources]);
  const esSources = useMemo(
    () => savedSources.filter((source) => source.type === 'esql'),
    [savedSources]
  );
  const connectorSources = useMemo(
    () => savedSources.filter((source) => source.type === 'connector'),
    [savedSources]
  );

  const canReadConnectors = useCanReadConnectors();
  const { connectorNameById, connectorActionTypeById, connectorTypeNameById } = useDataConnectors({
    enabled: connectorSources.length > 0 && canReadConnectors,
  });

  const persist = useCallback(
    async (next: SelectedSource[]): Promise<boolean> => {
      if (!aiIndex) {
        return false;
      }
      const saved = await saveSources(aiIndex, next);
      if (saved) {
        onSaved();
      }
      return saved;
    },
    [aiIndex, onSaved, saveSources]
  );

  const addSources = useCallback(
    (added: SelectedSource[]) => persist([...savedSources, ...added]),
    [persist, savedSources]
  );

  const removeSource = useCallback(
    (source: SelectedSource) =>
      persist(savedSources.filter((item) => !(item.type === source.type && item.id === source.id))),
    [persist, savedSources]
  );

  const closeAdd = useCallback(() => setAddingKind(undefined), []);

  const onRemove = isManaged ? undefined : removeSource;

  const addElasticsearchDataTitle = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.sources.addElasticsearchDataTitle',
    { defaultMessage: 'Add Elasticsearch data' }
  );
  const addConnectorsTitle = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.sources.addConnectorsTitle',
    { defaultMessage: 'Add connectors' }
  );
  const addElasticsearchDataDescription = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.sources.addElasticsearchDataCardDescription',
    { defaultMessage: 'Indices, data streams, aliases or ES|QL' }
  );
  const addConnectorsDescription = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.sources.addConnectorsCardDescription',
    {
      defaultMessage: 'Pick or create a connector',
    }
  );

  const connectorsAddCard =
    !isManaged && addingKind !== 'connector' ? (
      <AddSourceCard
        title={addConnectorsTitle}
        description={addConnectorsDescription}
        onClick={() => setAddingKind('connector')}
        data-test-subj="contextAddConnectorsCard"
      />
    ) : undefined;

  return (
    <div data-test-subj="contextSourcesPanel">
      <AiIndexDetailPanelDescription>
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.sources.panelDescription"
          defaultMessage="Context reads these sources to write knowledge documents. When you add or remove a source, Context updates them for you."
        />
      </AiIndexDetailPanelDescription>
      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={2} data-test-subj="contextAiIndexSourcesLoading" />
      ) : null}
      {!isLoading ? (
        <>
          <SourceTypePanel
            title={
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.tabs.elasticsearch"
                defaultMessage="Elasticsearch data"
              />
            }
            badgeCount={esSources.length}
            data-test-subj="contextElasticsearchDataPanel"
          >
            <ElasticsearchSourceList
              sources={esSources}
              onRemove={onRemove}
              disabled={isSaving}
              emptyMessage={
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.elasticsearchDataEmpty"
                  defaultMessage="No Elasticsearch data sources."
                />
              }
            />
            {esSources.length > 0 || !isManaged ? <EuiSpacer size="m" /> : null}
            {!isManaged && addingKind === 'esql' ? (
              <AddElasticsearchDataPanel
                savedSources={savedSources}
                onAdd={addSources}
                onClose={closeAdd}
                isSaving={isSaving}
              />
            ) : null}
            {!isManaged && addingKind !== 'esql' ? (
              <EuiFlexGrid columns={3} gutterSize="m">
                <EuiFlexItem>
                  <AddSourceCard
                    title={addElasticsearchDataTitle}
                    description={addElasticsearchDataDescription}
                    onClick={() => setAddingKind('esql')}
                    data-test-subj="contextAddElasticsearchDataCard"
                  />
                </EuiFlexItem>
              </EuiFlexGrid>
            ) : null}
          </SourceTypePanel>
          <EuiSpacer size="m" />
          <SourceTypePanel
            title={
              <FormattedMessage
                id="xpack.contextEngine.sourcePicker.tabs.connectors"
                defaultMessage="Connectors"
              />
            }
            badgeCount={connectorSources.length}
            data-test-subj="contextConnectorsPanel"
          >
            <ConnectorSourceGrid
              sources={connectorSources}
              connectorNameById={connectorNameById}
              connectorActionTypeById={connectorActionTypeById}
              connectorTypeNameById={connectorTypeNameById}
              onRemove={onRemove}
              disabled={isSaving}
              addCard={connectorsAddCard}
            />
            {!isManaged && addingKind === 'connector' ? (
              <>
                <EuiSpacer size="m" />
                <AddConnectorsPanel
                  savedSources={savedSources}
                  onAdd={addSources}
                  onClose={closeAdd}
                  isSaving={isSaving}
                />
              </>
            ) : null}
            {isManaged && connectorSources.length === 0 ? (
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.connectorsEmpty"
                  defaultMessage="No connectors."
                />
              </EuiText>
            ) : null}
          </SourceTypePanel>
        </>
      ) : null}
    </div>
  );
};
