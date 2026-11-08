/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { EuiFlexGroup, EuiPageTemplate, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import useLatest from 'react-use/lib/useLatest';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellDefinition, NotebookAttributes } from '../../common/types';
import { isCellFilterActive, matchesCellFilter } from '../model/cell_filter';
import { isPinnedTimeCell } from '../model/cell_factory';
import type { NotebookStore } from '../model/notebook_store';
import { useNotebookServices } from '../services';
import { AddCellBar } from './add_cell_bar';
import { CellFilterControls, CellFilterSummary } from './cell_filter_controls';
import { ChartCell } from './chart_cell';
import { CodeCell } from './code_cell';
import { CustomCell } from './custom_cell';
import { EsqlCell } from './esql_cell';
import { InputCell } from './input_cell';
import { MarkdownCell } from './markdown_cell';
import {
  NotebookContext,
  useNotebook,
  type NotebookContextValue,
  type SidePanel,
} from './notebook_context';
import { FloatingRunControls } from './floating_run_controls';
import { NotebookHeader } from './notebook_header';
import { VegaCell } from './vega_cell';
import { AppFlyout } from './app_flyout';
import { createNotebookContext } from './create_notebook_context';
import { GraphFlyout } from './graph_flyout';

const CellView = ({ cell }: { cell: CellDefinition }) => {
  switch (cell.type) {
    case 'esql':
      return <EsqlCell cell={cell} />;
    case 'chart':
      return <ChartCell cell={cell} />;
    case 'custom':
      return <CustomCell cell={cell} />;
    case 'vega':
      return <VegaCell cell={cell} />;
    case 'code':
      return <CodeCell cell={cell} />;
    case 'markdown':
      return <MarkdownCell cell={cell} />;
    case 'input':
      return <InputCell cell={cell} />;
  }
};

const PAGE_WIDTH = 1200;

const CellList = () => {
  const { store, cellFilter$ } = useNotebook();
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const cells = useStateFromPublishingSubject(store.cells$);
  const apps = useStateFromPublishingSubject(store.apps$);
  const filter = useStateFromPublishingSubject(cellFilter$);
  const isFiltering = isCellFilterActive(filter, apps);

  const listed = cellOrder.flatMap((id, index) => {
    const cell = cells[id];
    return cell && !isPinnedTimeCell(cell) ? [{ cell, index }] : [];
  });
  const shown = isFiltering
    ? listed.filter(({ cell }) => matchesCellFilter(cell, filter, apps))
    : listed;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {isFiltering && <CellFilterSummary shown={shown.length} total={listed.length} />}
      {shown.map(({ cell, index }) => (
        <Fragment key={cell.id}>
          {isFiltering ? <EuiSpacer size="s" /> : <AddCellBar index={index} />}
          <CellView cell={cell} />
        </Fragment>
      ))}
      {!isFiltering && <AddCellBar index={cellOrder.length} alwaysVisible={listed.length === 0} />}
    </EuiFlexGroup>
  );
};

export interface NotebookEditorProps {
  attributes: NotebookAttributes;
  /** The saved notebook's id; undefined for a notebook not saved yet. */
  notebookId?: string;
  /** Opens the app panel showing this app. */
  initialAppId?: string;
  onSave?: (store: NotebookStore) => Promise<void>;
}

export const NotebookEditor = ({
  attributes,
  notebookId,
  initialAppId,
  onSave,
}: NotebookEditorProps) => {
  const { plugins } = useNotebookServices();
  const [notebook] = useState<NotebookContextValue>(() =>
    createNotebookContext({ attributes, search: plugins.data.search, notebookId, initialAppId })
  );
  const [isSaving, setIsSaving] = useState(false);
  const headerRunControls = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();
  const { size } = euiTheme;
  // Room at the end for the cells' Run buttons (just outside each cell) and the floating controls
  // (pinned to the page edge). The section centres its content in what
  // the padding leaves, so the end padding is solved for an end margin of `reservedEnd`: none while
  // centring leaves enough, growing while the cells shift toward the start, then exactly
  // `reservedEnd` once they shrink.
  const reservedEnd = `(((${size.s} + ${size.xxxxl}) + (${size.m} + ${size.xxl} + ${size.m})) / 2 - 2px)`;
  const sectionCss = css`
    padding-inline-end: max(
      ${size.base},
      min(${reservedEnd}, calc(2 * ${reservedEnd} + ${PAGE_WIDTH}px + ${size.base} - 100%))
    );
  `;
  const sidePanel = useStateFromPublishingSubject(notebook.sidePanel$);
  useEffect(() => {
    notebook.scheduler.start();
    return () => notebook.scheduler.stop();
  }, [notebook]);

  useEffect(() => {
    if (sidePanel !== 'graph') notebook.focusedCell$.next(undefined);
  }, [notebook, sidePanel]);

  const toggleSidePanel = useCallback(
    (panel: SidePanel) =>
      notebook.sidePanel$.next(notebook.sidePanel$.getValue() === panel ? undefined : panel),
    [notebook]
  );
  const closeSidePanel = useCallback(() => notebook.sidePanel$.next(undefined), [notebook]);
  const focusCell = useCallback(
    (cellId: string | undefined) => {
      if (cellId) notebook.revealCell(cellId);
      else notebook.focusedCell$.next(undefined);
    },
    [notebook]
  );

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
      {sidePanel === 'graph' && <GraphFlyout onClose={closeSidePanel} onSelectCell={focusCell} />}
      {sidePanel === 'app' && <AppFlyout onClose={closeSidePanel} onRevealCell={focusCell} />}
      <EuiPageTemplate restrictWidth={PAGE_WIDTH} paddingSize="m">
        <FloatingRunControls headerControls={headerRunControls} />
        <EuiPageTemplate.Section paddingSize="m" grow={false} css={sectionCss}>
          <NotebookHeader
            runControlsRef={headerRunControls}
            onSave={onSave ? save : undefined}
            isSaving={isSaving}
            sidePanel={sidePanel}
            onToggleSidePanel={toggleSidePanel}
          />
        </EuiPageTemplate.Section>
        <EuiPageTemplate.Section paddingSize="m" css={sectionCss}>
          <CellList />
        </EuiPageTemplate.Section>
        <CellFilterControls />
      </EuiPageTemplate>
    </NotebookContext.Provider>
  );
};
