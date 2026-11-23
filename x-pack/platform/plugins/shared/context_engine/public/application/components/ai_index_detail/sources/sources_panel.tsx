/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiSkeletonText, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { useCanReadConnectors } from '../../../hooks/use_can_read_connectors';
import { useDataConnectors } from '../../../hooks/use_data_connectors';
import { useSaveAiIndexSources } from '../../../hooks/use_save_ai_index_sources';
import { toSelectedSources } from '../../../utils/sources';
import type { SelectedSource } from './types';
import { SourceTypePanel } from './source_type_panel';
import { AddSourceCard } from './add_source_card';
import { AddConnectorsPanel, AddElasticsearchDataPanel } from './add_sources_panels';
import { AiIndexDetailPanelDescription } from '../ai_index_detail_panel_description';
import { ConnectorSourceGrid } from './connector_source_grid';
import { ElasticsearchSourceList } from './elasticsearch_source_list';
import { ADD_CONNECTORS_TITLE, ADD_ELASTICSEARCH_DATA_TITLE } from './translations';

type SourcesAddingKind = 'elasticsearch' | 'connector';

interface SourcesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void | Promise<unknown>;
  isManaged: boolean;
  /** False where the page already explains sources, e.g. the setup wizard. Defaults to true. */
  showDescription?: boolean;
  /**
   * Tells the parent while a change is saving and the AI index reloads, so the parent can hold its
   * own saves: each save sends the whole AI index, and a stale one would drop the new sources.
   */
  onSavingChange?: (isSaving: boolean) => void;
}

export const SourcesPanel = ({
  isLoading,
  aiIndex,
  onSaved,
  isManaged,
  showDescription = true,
  onSavingChange,
}: SourcesPanelProps) => {
  const { saveSources, isSaving: isSavingRequest } = useSaveAiIndexSources();
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Controls stay disabled until the refetch lands, so the next edit never builds from a stale list.
  const isSaving = isSavingRequest || isRefreshing;

  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);
  // Unmounted mid-save: don't leave the parent waiting.
  useEffect(() => () => onSavingChange?.(false), [onSavingChange]);
  const [addingKind, setAddingKind] = useState<SourcesAddingKind | undefined>();

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
      if (!saved) {
        return false;
      }
      setIsRefreshing(true);
      try {
        await onSaved();
      } finally {
        setIsRefreshing(false);
      }
      return true;
    },
    [aiIndex, onSaved, saveSources]
  );

  const addSources = useCallback(
    (added: SelectedSource[]) => persist([...savedSources, ...added]),
    [persist, savedSources]
  );

  const removeSource = useCallback(
    (source: SelectedSource) =>
      persist(
        savedSources.filter((item) => !(item.type === source.type && item.value === source.value))
      ),
    [persist, savedSources]
  );

  const closeAdd = useCallback(() => setAddingKind(undefined), []);

  const onRemove = isManaged ? undefined : removeSource;

  const connectorsAddCard =
    !isManaged && addingKind !== 'connector' ? (
      <AddSourceCard
        title={ADD_CONNECTORS_TITLE}
        description={i18n.translate(
          'xpack.contextEngine.aiIndexDetail.sources.addConnectorsCardDescription',
          { defaultMessage: 'Pick or create a connector' }
        )}
        onClick={() => setAddingKind('connector')}
        data-test-subj="contextAddConnectorsCard"
      />
    ) : undefined;

  return (
    <div data-test-subj="contextSourcesPanel">
      {showDescription ? (
        <>
          <AiIndexDetailPanelDescription>
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.sources.panelDescription"
              defaultMessage="Context reads these sources to write knowledge documents."
            />
          </AiIndexDetailPanelDescription>
          <EuiSpacer size="m" />
        </>
      ) : null}
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
            {!isManaged && addingKind === 'elasticsearch' ? (
              <AddElasticsearchDataPanel
                savedSources={savedSources}
                onAdd={addSources}
                onClose={closeAdd}
                isSaving={isSaving}
              />
            ) : null}
            {!isManaged && addingKind !== 'elasticsearch' ? (
              <EuiFlexGrid columns={3} gutterSize="m">
                <EuiFlexItem>
                  <AddSourceCard
                    title={ADD_ELASTICSEARCH_DATA_TITLE}
                    description={i18n.translate(
                      'xpack.contextEngine.aiIndexDetail.sources.addElasticsearchDataCardDescription',
                      { defaultMessage: 'Indices, data streams, aliases or ES|QL' }
                    )}
                    onClick={() => setAddingKind('elasticsearch')}
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
            {connectorSources.length === 0 ? (
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.connectorsEmpty"
                  defaultMessage="No connectors."
                />
              </EuiText>
            ) : null}
            {connectorSources.length === 0 && !isManaged ? <EuiSpacer size="m" /> : null}
            <ConnectorSourceGrid
              sources={connectorSources}
              connectorNameById={connectorNameById}
              connectorActionTypeById={connectorActionTypeById}
              connectorTypeNameById={connectorTypeNameById}
              onRemove={onRemove}
              disabled={isSaving}
              addCard={connectorsAddCard}
            />
            {connectorSources.length > 0 || !isManaged ? <EuiSpacer size="m" /> : null}
            {!isManaged && addingKind === 'connector' ? (
              <AddConnectorsPanel
                savedSources={savedSources}
                onAdd={addSources}
                onClose={closeAdd}
                isSaving={isSaving}
              />
            ) : null}
          </SourceTypePanel>
        </>
      ) : null}
    </div>
  );
};
