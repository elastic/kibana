/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useCreateConnectorFlyout } from '../../../hooks/use_create_connector_flyout';
import { createIndexEsqlQuery, hasSelectedEsqlQuery, toEsqlSource } from '../../../utils/sources';
import { ConnectorSelect } from './connector_select';
import {
  ElasticsearchSourcesPanel,
  type ElasticsearchSourceMode,
} from './elasticsearch_sources_panel';
import type { SelectedSource } from './types';
import { AddSourcePanel } from './add_source_panel';
import { ADD_CONNECTORS_TITLE, ADD_ELASTICSEARCH_DATA_TITLE } from './translations';

interface AddPanelProps {
  savedSources: SelectedSource[];
  onAdd: (sources: SelectedSource[]) => Promise<boolean>;
  onClose: () => void;
  isSaving: boolean;
}

const toggleChecked = <T,>(
  current: T[],
  isMatch: (item: T) => boolean,
  checked: boolean,
  nextItem: T
): T[] => {
  const others = current.filter((item) => !isMatch(item));
  return checked ? [...others, nextItem] : others;
};

export const AddElasticsearchDataPanel = ({
  savedSources,
  onAdd,
  onClose,
  isSaving,
}: AddPanelProps) => {
  const [pendingIndexNames, setPendingIndexNames] = useState<string[]>([]);
  const [mode, setMode] = useState<ElasticsearchSourceMode>('index');
  const toggleMode = useCallback(
    () => setMode((current) => (current === 'index' ? 'esql' : 'index')),
    []
  );
  const [esqlQuery, setEsqlQuery] = useState('');

  const esqlSources = useMemo<SelectedSource[]>(() => {
    const query = esqlQuery.trim();
    if (!query || hasSelectedEsqlQuery(savedSources, query)) {
      return [];
    }
    return [toEsqlSource(query)];
  }, [esqlQuery, savedSources]);

  const indexSources = useMemo<SelectedSource[]>(
    () =>
      pendingIndexNames
        .map(createIndexEsqlQuery)
        .filter((query) => !hasSelectedEsqlQuery(savedSources, query))
        .map(toEsqlSource),
    [pendingIndexNames, savedSources]
  );

  const sourcesToAdd = mode === 'index' ? indexSources : esqlSources;

  const onToggleIndex = useCallback((indexName: string, checked: boolean) => {
    setPendingIndexNames((current) =>
      toggleChecked(current, (name) => name === indexName, checked, indexName)
    );
  }, []);

  const confirm = useCallback(async () => {
    if (await onAdd(sourcesToAdd)) {
      onClose();
    }
  }, [onAdd, onClose, sourcesToAdd]);

  return (
    <AddSourcePanel
      title={ADD_ELASTICSEARCH_DATA_TITLE}
      pendingCount={sourcesToAdd.length}
      onClose={onClose}
      onConfirm={confirm}
      isSaving={isSaving}
      headerAction={
        <EuiButtonEmpty
          size="s"
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
              defaultMessage="Pick indices instead"
            />
          )}
        </EuiButtonEmpty>
      }
      data-test-subj="contextAddElasticsearchDataPanel"
    >
      <ElasticsearchSourcesPanel
        savedSources={savedSources}
        pendingIndexNames={pendingIndexNames}
        onToggleIndex={onToggleIndex}
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
    ({ id, checked }: { id: string; name: string; checked: boolean }) => {
      setPending((current) =>
        toggleChecked(current, (source) => source.value === id, checked, {
          type: 'connector',
          value: id,
        })
      );
    },
    []
  );

  const confirm = useCallback(async () => {
    if (await onAdd(pending)) {
      onClose();
    }
  }, [onAdd, onClose, pending]);

  const { canCreateConnector, canReadConnectors, openCreateFlyout, createConnectorFlyout } =
    useCreateConnectorFlyout({ onConnectorCreated: onToggle });

  return (
    <>
      <AddSourcePanel
        title={ADD_CONNECTORS_TITLE}
        pendingCount={pending.length}
        onClose={onClose}
        onConfirm={confirm}
        isSaving={isSaving}
        data-test-subj="contextAddConnectorsPanel"
      >
        <ConnectorSelect
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
