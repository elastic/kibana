/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useCreateConnectorFlyout } from '../../hooks/use_create_connector_flyout';
import { createIndexEsqlQuery, hasSelectedEsqlQuery } from '../../utils/sources';
import { ConnectorsTab } from '../source_picker/connectors_tab';
import {
  ElasticsearchSourcesPanel,
  type ElasticsearchSourceMode,
} from '../source_picker/elasticsearch_sources_panel';
import type { SelectedSource } from '../source_picker';
import { AddSourcePanel } from './add_source_panel';

interface AddPanelProps {
  savedSources: SelectedSource[];
  onAdd: (sources: SelectedSource[]) => Promise<boolean>;
  onClose: () => void;
  isSaving: boolean;
}

export const AddElasticsearchDataPanel = ({
  savedSources,
  onAdd,
  onClose,
  isSaving,
}: AddPanelProps) => {
  const [pending, setPending] = useState<SelectedSource[]>([]);
  const [mode, setMode] = useState<ElasticsearchSourceMode>('index');
  const toggleMode = useCallback(
    () => setMode((current) => (current === 'index' ? 'esql' : 'index')),
    []
  );
  const [esqlQuery, setEsqlQuery] = useState('');
  const allSelected = useMemo(() => [...savedSources, ...pending], [savedSources, pending]);

  const esqlSources = useMemo<SelectedSource[]>(() => {
    const query = esqlQuery.trim();
    if (!query || hasSelectedEsqlQuery(savedSources, query)) {
      return [];
    }
    return [{ type: 'esql', id: query, label: query, value: query }];
  }, [esqlQuery, savedSources]);

  const sourcesToAdd = mode === 'index' ? pending : esqlSources;

  const onAddIndex = useCallback(
    (indexName: string) => {
      const query = createIndexEsqlQuery(indexName);
      if (hasSelectedEsqlQuery(allSelected, query)) {
        return;
      }
      setPending((current) => [
        ...current,
        { type: 'esql', id: query, label: query, value: query },
      ]);
    },
    [allSelected]
  );

  const confirm = useCallback(async () => {
    if (await onAdd(sourcesToAdd)) {
      onClose();
    }
  }, [onAdd, onClose, sourcesToAdd]);

  const onRemovePending = useCallback((source: SelectedSource) => {
    setPending((current) => current.filter((item) => item.id !== source.id));
  }, []);

  return (
    <AddSourcePanel
      title={
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.sources.addElasticsearchDataTitle"
          defaultMessage="Add Elasticsearch data"
        />
      }
      pendingSources={sourcesToAdd}
      showPendingList={mode === 'index'}
      onRemovePending={onRemovePending}
      onClose={onClose}
      onConfirm={confirm}
      isSaving={isSaving}
      headerAction={
        <EuiButtonEmpty
          size="xs"
          iconType={mode === 'index' ? 'code' : 'listBullet'}
          onClick={toggleMode}
          isDisabled={isSaving}
          data-test-subj="contextToggleEsqlModeButton"
        >
          {mode === 'index' ? (
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.sources.useEsqlInstead"
              defaultMessage="Use ES|QL instead"
            />
          ) : (
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.sources.useIndexPickerInstead"
              defaultMessage="Use index picker instead"
            />
          )}
        </EuiButtonEmpty>
      }
      data-test-subj="contextAddElasticsearchDataPanel"
    >
      <ElasticsearchSourcesPanel
        selectedSources={allSelected}
        onAddIndex={onAddIndex}
        esqlQuery={esqlQuery}
        onEsqlQueryChange={setEsqlQuery}
        disabled={isSaving}
        mode={mode}
      />
    </AddSourcePanel>
  );
};

export const AddConnectorsPanel = ({ savedSources, onAdd, onClose, isSaving }: AddPanelProps) => {
  const [pending, setPending] = useState<SelectedSource[]>([]);

  const savedConnectorIds = useMemo(
    () =>
      savedSources.filter((source) => source.type === 'connector').map((source) => source.value),
    [savedSources]
  );

  const allConnectorIds = useMemo(
    () =>
      [...savedSources, ...pending]
        .filter((source) => source.type === 'connector')
        .map((source) => source.value),
    [savedSources, pending]
  );

  const onToggle = useCallback(
    ({ id, name, checked }: { id: string; name: string; checked: boolean }) => {
      setPending((current) => {
        const others = current.filter((source) => source.id !== id);
        if (checked) {
          return [...others, { type: 'connector', id, label: name, value: id }];
        }
        return others;
      });
    },
    []
  );

  const confirm = useCallback(async () => {
    if (await onAdd(pending)) {
      onClose();
    }
  }, [onAdd, onClose, pending]);

  const onRemovePending = useCallback((source: SelectedSource) => {
    setPending((current) => current.filter((item) => item.id !== source.id));
  }, []);

  const {
    canCreateConnector,
    canReadConnectors,
    openCreateFlyout,
    createConnectorButton,
    createConnectorFlyout,
  } = useCreateConnectorFlyout({ onConnectorCreated: onToggle, disabled: isSaving });

  return (
    <>
      <AddSourcePanel
        title={
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.sources.addConnectorsTitle"
            defaultMessage="Add connectors"
          />
        }
        pendingSources={pending}
        showPendingList={false}
        onRemovePending={onRemovePending}
        onClose={onClose}
        onConfirm={confirm}
        isSaving={isSaving}
        headerAction={createConnectorButton}
        data-test-subj="contextAddConnectorsPanel"
      >
        <ConnectorsTab
          selectedConnectorIds={allConnectorIds}
          savedConnectorIds={savedConnectorIds}
          onToggle={onToggle}
          disabled={isSaving}
          onOpenCreateConnector={openCreateFlyout}
          canCreateConnector={canCreateConnector}
          canReadConnectors={canReadConnectors}
        />
      </AddSourcePanel>
      {createConnectorFlyout}
    </>
  );
};
