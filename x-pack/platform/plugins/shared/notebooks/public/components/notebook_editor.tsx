/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import useLatest from 'react-use/lib/useLatest';
import { BehaviorSubject } from 'rxjs';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellDefinition, NotebookAttributes } from '../../common/types';
import { isPinnedTimeCell } from '../model/cell_factory';
import { NotebookStore } from '../model/notebook_store';
import { createRunQuery } from '../model/run_query';
import { NotebookScheduler } from '../model/scheduler';
import { useNotebookServices } from '../services';
import { AddCellBar } from './add_cell_bar';
import { ChartCell } from './chart_cell';
import { EsqlCell } from './esql_cell';
import { InputCell } from './input_cell';
import { MarkdownCell } from './markdown_cell';
import { NotebookContext, useNotebook, type NotebookContextValue } from './notebook_context';
import { NotebookHeader, type NotebookView } from './notebook_header';
import { getCellElementId } from './cell_display';

const LazyDependencyGraph = React.lazy(async () => {
  const { DependencyGraph } = await import('./dependency_graph');
  return { default: DependencyGraph };
});

const CellView = ({ cell }: { cell: CellDefinition }) => {
  switch (cell.type) {
    case 'esql':
      return <EsqlCell cell={cell} />;
    case 'chart':
      return <ChartCell cell={cell} />;
    case 'markdown':
      return <MarkdownCell cell={cell} />;
    case 'input':
      return <InputCell cell={cell} />;
  }
};

const CellList = () => {
  const { store } = useNotebook();
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const cells = useStateFromPublishingSubject(store.cells$);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {cellOrder.map((id, index) => {
        const cell = cells[id];
        if (!cell || isPinnedTimeCell(cell)) return null;
        return (
          <Fragment key={id}>
            <AddCellBar index={index} />
            <CellView cell={cell} />
          </Fragment>
        );
      })}
      <AddCellBar index={cellOrder.length} alwaysVisible />
    </EuiFlexGroup>
  );
};

export interface NotebookEditorProps {
  attributes: NotebookAttributes;
  onSave?: (store: NotebookStore) => Promise<void>;
}

export const NotebookEditor = ({ attributes, onSave }: NotebookEditorProps) => {
  const { plugins } = useNotebookServices();
  const [notebook] = useState<NotebookContextValue>(() => {
    const store = new NotebookStore(attributes);
    const scheduler = new NotebookScheduler(store, {
      runQuery: createRunQuery(plugins.data.search),
    });
    return { store, scheduler, openFlyouts$: new BehaviorSubject(0) };
  });
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<NotebookView>('notebook');
  const [focusedCell, setFocusedCell] = useState<string>();

  useEffect(() => {
    notebook.scheduler.start();
    return () => notebook.scheduler.stop();
  }, [notebook]);

  useEffect(() => {
    if (view !== 'notebook' || !focusedCell) return;
    document
      .getElementById(getCellElementId(focusedCell))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFocusedCell(undefined);
  }, [view, focusedCell]);

  const selectCell = useCallback((cellId: string) => {
    setFocusedCell(cellId);
    setView('notebook');
  }, []);

  const latestOnSave = useLatest(onSave);
  const save = useCallback(async () => {
    if (!latestOnSave.current) return;
    setIsSaving(true);
    try {
      await latestOnSave.current(notebook.store);
    } finally {
      setIsSaving(false);
    }
  }, [latestOnSave, notebook]);

  return (
    <NotebookContext.Provider value={notebook}>
      <EuiPageTemplate restrictWidth={1200} paddingSize="m">
        <EuiPageTemplate.Section paddingSize="m" grow={false}>
          <NotebookHeader
            onSave={onSave ? save : undefined}
            isSaving={isSaving}
            view={view}
            onViewChange={setView}
          />
        </EuiPageTemplate.Section>
        <EuiPageTemplate.Section paddingSize="m">
          {view === 'graph' ? (
            <Suspense fallback={<EuiLoadingSpinner />}>
              <LazyDependencyGraph onSelectCell={selectCell} />
            </Suspense>
          ) : (
            <CellList />
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </NotebookContext.Provider>
  );
};
