/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { ChartType } from '@kbn/visualization-utils';
import type { ChartCellDefinition, LensAttributes } from '../../common/types';
import { getCellDisplayName } from '../model/references';
import {
  applyEditorState,
  getChartType,
  hasAllReferencedColumns,
  injectTable,
  stripTables,
  suggestChart,
  type NotebookChartType,
} from '../charts/lens_helpers';
import { useNotebookServices } from '../services';
import { CellFrame } from './cell_frame';
import { ResizableCellBody } from './resizable_cell_body';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';

const SOURCE_LABEL = i18n.translate('xpack.notebook.chartCell.source', {
  defaultMessage: 'Source',
});
const EDIT_CHART_LABEL = i18n.translate('xpack.notebook.chartCell.editFlyout', {
  defaultMessage: 'Edit chart',
});

const PICK_SOURCE_MESSAGE = i18n.translate('xpack.notebook.chartCell.pickSource', {
  defaultMessage: 'Pick an ES|QL cell as the source.',
});

type EditLensConfigPanelComponent = Awaited<ReturnType<LensPublicStart['EditLensConfigPanelApi']>>;

/** The edit flyout's draft: a source and the chart for its results, applied together. */
interface ChartEditor {
  EditPanel: EditLensConfigPanelComponent;
  sourceCell: string | null;
  /** Absent until the draft source has results that a chart fits. */
  chart?: { attributes: LensAttributes; table: Datatable };
  isSuggesting?: boolean;
  error?: string;
  /** Remounts the Lens panel whenever the draft chart is replaced. */
  revision: number;
}

const CHART_HEIGHT = 300;
const METRIC_HEIGHT = 160;

/** The rendered chart, or a prompt explaining why there is none yet. */
export const ChartCanvas = ({
  id,
  attributes,
  hasSource,
}: {
  id: string;
  attributes: LensAttributes | undefined;
  hasSource: boolean;
}) => {
  const { plugins } = useNotebookServices();
  const LensComponent = plugins.lens.EmbeddableComponent;
  return attributes ? (
    <LensComponent
      id={id}
      attributes={attributes}
      style={{ height: '100%' }}
      withDefaultActions={false}
      disableTriggers
      noPadding
    />
  ) : (
    <EuiEmptyPrompt
      titleSize="xs"
      body={
        hasSource
          ? i18n.translate('xpack.notebook.chartCell.waiting', {
              defaultMessage: 'Waiting for the source cell to produce results.',
            })
          : i18n.translate('xpack.notebook.chartCell.editToPickSource', {
              defaultMessage: 'Edit the chart to pick an ES|QL cell as its source.',
            })
      }
    />
  );
};

/** The chart's saved Lens attributes bound to its latest results. */
export const useChartAttributes = (
  cell: ChartCellDefinition,
  override?: LensAttributes
): LensAttributes | undefined => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const table = runtime.output?.kind === 'table' ? runtime.output.table : undefined;
  const rendered = override ?? cell.lensAttributes;
  return useMemo(
    () => (rendered && table ? injectTable(rendered, table) : undefined),
    [rendered, table]
  );
};

export const ChartCell = ({ cell }: { cell: ChartCellDefinition }) => {
  const { plugins } = useNotebookServices();
  const { store, scheduler } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const cells = useStateFromPublishingSubject(store.cells$);
  const [regenerated, setRegenerated] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string>();
  const [editor, setEditor] = useState<ChartEditor>();
  const [preview, setPreview] = useState<LensAttributes>();
  const latestSuggestion = useRef<object>();
  const latestDraftSuggestion = useRef<object>();

  const { id, sourceCell, lensAttributes } = cell;
  const source = sourceCell ? cells[sourceCell] : undefined;
  const sourceQuery = source?.type === 'esql' ? source.query : undefined;
  const table = runtime.output?.kind === 'table' ? runtime.output.table : undefined;
  const esqlCells = Object.values(cells).filter((candidate) => candidate.type === 'esql');

  const setAttributes = useCallback(
    (next: LensAttributes | null) =>
      store.updateCell(id, (current) =>
        current.type === 'chart' ? { ...current, lensAttributes: next } : current
      ),
    [store, id]
  );

  /** Suggests a chart for the results; regenerating keeps the current type when it still fits. */
  const suggest = useCallback(
    async (regeneratedType?: NotebookChartType) => {
      if (!table || !sourceQuery) return;
      const token = {};
      latestSuggestion.current = token;
      try {
        const attributes = await suggestChart({
          lens: plugins.lens,
          dataViews: plugins.data.dataViews,
          query: sourceQuery,
          table,
          chartType: regeneratedType,
        });
        if (latestSuggestion.current !== token) return;
        setSuggestionError(undefined);
        setRegenerated(regeneratedType !== undefined);
        setAttributes(attributes ?? null);
      } catch (error) {
        if (latestSuggestion.current === token) setSuggestionError(error.message);
      }
    },
    [table, sourceQuery, plugins, setAttributes]
  );

  useEffect(() => {
    if (!table) return;
    if (!lensAttributes) {
      suggest();
    } else if (!hasAllReferencedColumns(lensAttributes, table)) {
      suggest(getChartType(lensAttributes));
    }
  }, [table, lensAttributes, suggest]);

  const cellAttributes = useChartAttributes(cell);
  const attributes = preview ?? cellAttributes;
  const currentType = lensAttributes ? getChartType(lensAttributes) : undefined;

  const openEditor = async () => {
    const EditPanel = await plugins.lens.EditLensConfigPanelApi();
    setEditor({
      EditPanel,
      sourceCell,
      chart: cellAttributes && table ? { attributes: cellAttributes, table } : undefined,
      revision: 0,
    });
  };

  const closeEditor = useCallback(() => {
    latestDraftSuggestion.current = undefined;
    setEditor(undefined);
    setPreview(undefined);
  }, []);

  const selectDraftSource = async (draftSource: string) => {
    const token = {};
    latestDraftSuggestion.current = token;
    setPreview(undefined);
    const draftCell = cells[draftSource];
    const draftOutput = store.getRuntime(draftSource).output;
    const draftTable = draftOutput?.kind === 'table' ? draftOutput.table : undefined;
    const update = (patch: Partial<ChartEditor>) =>
      setEditor((current) =>
        current && latestDraftSuggestion.current === token
          ? { ...current, sourceCell: draftSource, revision: current.revision + 1, ...patch }
          : current
      );
    if (draftSource === sourceCell && cellAttributes && table) {
      update({
        chart: { attributes: cellAttributes, table },
        isSuggesting: false,
        error: undefined,
      });
      return;
    }
    update({ chart: undefined, isSuggesting: Boolean(draftTable), error: undefined });
    if (!draftTable || draftCell?.type !== 'esql') return;
    try {
      const suggested = await suggestChart({
        lens: plugins.lens,
        dataViews: plugins.data.dataViews,
        query: draftCell.query,
        table: draftTable,
        chartType: currentType,
      });
      update({
        chart: suggested
          ? { attributes: injectTable(suggested, draftTable), table: draftTable }
          : undefined,
        isSuggesting: false,
      });
    } catch (error) {
      update({ isSuggesting: false, error: error.message });
    }
  };

  // The Lens panel rebuilds its store on every render, so it must not re-render on preview updates.
  const editPanel = useMemo(() => {
    if (!editor?.chart) return null;
    const {
      EditPanel,
      sourceCell: draftSource,
      chart: { attributes: initial, table: draftTable },
      revision,
    } = editor;
    return (
      <EditPanel
        key={revision}
        attributes={initial}
        updatePanelState={(datasourceState, visualizationState, visualizationId) =>
          setPreview(
            injectTable(
              applyEditorState(initial, datasourceState, visualizationState, visualizationId),
              draftTable
            )
          )
        }
        onApply={(applied) => {
          store.updateCell(id, (current) =>
            current.type === 'chart'
              ? { ...current, sourceCell: draftSource, lensAttributes: stripTables(applied) }
              : current
          );
          closeEditor();
        }}
        onCancel={closeEditor}
        closeFlyout={closeEditor}
        hideTextBasedEditor
        displayFlyoutHeader
      />
    );
  }, [editor, store, id, closeEditor]);

  const getDraftMessage = ({ sourceCell: draftSource }: ChartEditor): string => {
    if (!draftSource) return PICK_SOURCE_MESSAGE;
    const output = store.getRuntime(draftSource).output;
    return output?.kind === 'table'
      ? i18n.translate('xpack.notebook.chartCell.noSuggestion', {
          defaultMessage: 'No chart fits the results of this source.',
        })
      : i18n.translate('xpack.notebook.chartCell.runSource', {
          defaultMessage: 'Run the source cell to chart its results.',
        });
  };

  const editFlyout = editor && (
    <NotebookFlyout
      type="push"
      ownFocus
      paddingSize="m"
      hideCloseButton={Boolean(editPanel)}
      onClose={closeEditor}
      aria-label={EDIT_CHART_LABEL}
      data-test-subj="notebookChartEditFlyout"
    >
      <EuiFlyoutHeader>
        <EuiSelect
          compressed
          fullWidth
          prepend={SOURCE_LABEL}
          aria-label={SOURCE_LABEL}
          hasNoInitialSelection={!editor.sourceCell}
          value={editor.sourceCell ?? ''}
          options={esqlCells.map((esqlCell) => ({
            value: esqlCell.id,
            text: getCellDisplayName(esqlCell),
          }))}
          onChange={(event) => selectDraftSource(event.target.value)}
          data-test-subj="notebookChartSource"
        />
      </EuiFlyoutHeader>
      {editPanel ?? (
        <>
          <EuiFlyoutBody>
            {editor.error ? (
              <KbnDangerCallout announceOnMount size="s" title={editor.error} />
            ) : editor.isSuggesting ? (
              <EuiLoadingSpinner size="l" />
            ) : (
              <EuiEmptyPrompt titleSize="xs" body={getDraftMessage(editor)} />
            )}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiButtonEmpty flush="left" onClick={closeEditor} data-test-subj="notebookChartCancel">
              {i18n.translate('xpack.notebook.chartCell.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlyoutFooter>
        </>
      )}
    </NotebookFlyout>
  );

  return (
    <CellFrame
      cell={cell}
      runtime={runtime}
      onRun={() => scheduler.runCell(id)}
      headerActions={
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="pencil"
            onClick={openEditor}
            data-test-subj="notebookChartEdit"
          >
            {i18n.translate('xpack.notebook.chartCell.edit', { defaultMessage: 'Edit' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      }
    >
      {regenerated && (
        <>
          <KbnInfoCallout
            announceOnMount
            size="s"
            title={i18n.translate('xpack.notebook.chartCell.regenerated', {
              defaultMessage: 'Chart regenerated: columns changed',
            })}
            onDismiss={() => setRegenerated(false)}
            data-test-subj="notebookChartRegenerated"
          />
          <EuiSpacer size="s" />
        </>
      )}
      {suggestionError && (
        <>
          <KbnDangerCallout announceOnMount size="s" title={suggestionError} />
          <EuiSpacer size="s" />
        </>
      )}
      <ResizableCellBody
        defaultHeight={currentType === ChartType.Metric ? METRIC_HEIGHT : CHART_HEIGHT}
        data-test-subj="notebookChartContainer"
      >
        <ChartCanvas
          id={`notebook-chart-${id}`}
          attributes={attributes}
          hasSource={sourceCell !== null}
        />
      </ResizableCellBody>
      {editFlyout}
    </CellFrame>
  );
};
