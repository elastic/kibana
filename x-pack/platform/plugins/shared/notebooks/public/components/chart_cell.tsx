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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { ChartType } from '@kbn/visualization-utils';
import type { ChartCellDefinition, LensAttributes } from '../../common/types';
import {
  CHART_TYPE_OPTIONS,
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
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';

const SOURCE_LABEL = i18n.translate('xpack.notebook.chartCell.source', {
  defaultMessage: 'Source',
});
const TYPE_LABEL = i18n.translate('xpack.notebook.chartCell.type', { defaultMessage: 'Type' });
const EDIT_CHART_LABEL = i18n.translate('xpack.notebook.chartCell.editFlyout', {
  defaultMessage: 'Edit chart',
});

const CHART_TYPE_LABELS: Record<NotebookChartType, string> = {
  [ChartType.Bar]: i18n.translate('xpack.notebook.chartCell.type.bar', { defaultMessage: 'Bar' }),
  [ChartType.Line]: i18n.translate('xpack.notebook.chartCell.type.line', {
    defaultMessage: 'Line',
  }),
  [ChartType.Area]: i18n.translate('xpack.notebook.chartCell.type.area', {
    defaultMessage: 'Area',
  }),
  [ChartType.Metric]: i18n.translate('xpack.notebook.chartCell.type.metric', {
    defaultMessage: 'Metric',
  }),
  [ChartType.Table]: i18n.translate('xpack.notebook.chartCell.type.table', {
    defaultMessage: 'Table',
  }),
  [ChartType.Pie]: i18n.translate('xpack.notebook.chartCell.type.pie', { defaultMessage: 'Pie' }),
};

type EditLensConfigPanelComponent = Awaited<ReturnType<LensPublicStart['EditLensConfigPanelApi']>>;

const chartContainerCss = css`
  height: 300px;
  min-height: 120px;
  resize: vertical;
  overflow: hidden;
`;

const metricContainerCss = css`
  height: 160px;
`;

export const ChartCell = ({ cell }: { cell: ChartCellDefinition }) => {
  const { plugins } = useNotebookServices();
  const { store, scheduler } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const cells = useStateFromPublishingSubject(store.cells$);
  const [regenerated, setRegenerated] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string>();
  const [unavailableType, setUnavailableType] = useState<NotebookChartType>();
  const [editor, setEditor] = useState<{
    EditPanel: EditLensConfigPanelComponent;
    attributes: LensAttributes;
  }>();
  const [preview, setPreview] = useState<LensAttributes>();
  const latestSuggestion = useRef<object>();

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

  const suggest = useCallback(
    async (chartType?: NotebookChartType, isRegeneration = false) => {
      if (!table || !sourceQuery) return;
      const token = {};
      latestSuggestion.current = token;
      try {
        const attributes = await suggestChart({
          lens: plugins.lens,
          dataViews: plugins.data.dataViews,
          query: sourceQuery,
          table,
          chartType,
        });
        if (latestSuggestion.current !== token) return;
        setSuggestionError(undefined);
        // Lens falls back to another type when the requested one doesn't fit the columns.
        const isUnavailable =
          chartType !== undefined &&
          !isRegeneration &&
          (!attributes || getChartType(attributes) !== chartType);
        setUnavailableType(isUnavailable ? chartType : undefined);
        if (isUnavailable) return;
        setRegenerated(isRegeneration);
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
      suggest(getChartType(lensAttributes), true);
    }
  }, [table, lensAttributes, suggest]);

  const rendered = preview ?? lensAttributes;
  const attributes = useMemo(
    () => (rendered && table ? injectTable(rendered, table) : undefined),
    [rendered, table]
  );

  const openEditor = async () => {
    if (!attributes) return;
    const EditPanel = await plugins.lens.EditLensConfigPanelApi();
    setEditor({ EditPanel, attributes });
  };

  const closeEditor = useCallback(() => {
    setEditor(undefined);
    setPreview(undefined);
  }, []);

  // The Lens panel rebuilds its store on every render, so it must not re-render on preview updates.
  const editPanel = useMemo(() => {
    if (!editor) return null;
    const { EditPanel, attributes: initial } = editor;
    return (
      <NotebookFlyout
        ownFocus
        paddingSize="m"
        hideCloseButton
        onClose={closeEditor}
        aria-label={EDIT_CHART_LABEL}
        data-test-subj="notebookChartEditFlyout"
      >
        <EditPanel
          attributes={initial}
          updatePanelState={(datasourceState, visualizationState, visualizationId) =>
            setPreview(
              applyEditorState(initial, datasourceState, visualizationState, visualizationId)
            )
          }
          onApply={(applied) => {
            setAttributes(stripTables(applied));
            closeEditor();
          }}
          onCancel={closeEditor}
          closeFlyout={closeEditor}
          hideTextBasedEditor
          displayFlyoutHeader
        />
      </NotebookFlyout>
    );
  }, [editor, setAttributes, closeEditor]);

  const currentType = lensAttributes ? getChartType(lensAttributes) : undefined;
  const LensComponent = plugins.lens.EmbeddableComponent;

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
            isDisabled={!attributes}
            data-test-subj="notebookChartEdit"
          >
            {i18n.translate('xpack.notebook.chartCell.edit', { defaultMessage: 'Edit' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      }
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
          <EuiSelect
            compressed
            prepend={SOURCE_LABEL}
            aria-label={SOURCE_LABEL}
            hasNoInitialSelection={!sourceCell}
            value={sourceCell ?? ''}
            options={esqlCells.map((esqlCell) => ({ value: esqlCell.id, text: esqlCell.name }))}
            onChange={(event) =>
              store.updateCell(id, (current) =>
                current.type === 'chart'
                  ? { ...current, sourceCell: event.target.value, lensAttributes: null }
                  : current
              )
            }
            data-test-subj="notebookChartSource"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 160 }}>
          <EuiSelect
            compressed
            prepend={TYPE_LABEL}
            aria-label={TYPE_LABEL}
            hasNoInitialSelection={!currentType}
            value={currentType ?? ''}
            disabled={!table}
            options={CHART_TYPE_OPTIONS.map((chartType) => ({
              value: chartType,
              text: CHART_TYPE_LABELS[chartType],
            }))}
            onChange={(event) =>
              suggest(CHART_TYPE_OPTIONS.find((chartType) => chartType === event.target.value))
            }
            data-test-subj="notebookChartType"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
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
      {unavailableType && (
        <>
          <KbnWarningCallout
            announceOnMount
            size="s"
            title={i18n.translate('xpack.notebook.chartCell.typeUnavailable', {
              defaultMessage: "{type} isn't available for these columns",
              values: { type: CHART_TYPE_LABELS[unavailableType] },
            })}
            onDismiss={() => setUnavailableType(undefined)}
            data-test-subj="notebookChartTypeUnavailable"
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
      <div
        css={[chartContainerCss, currentType === ChartType.Metric && metricContainerCss]}
        data-test-subj="notebookChartContainer"
      >
        {attributes ? (
          <LensComponent
            id={`notebook-chart-${id}`}
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
              sourceCell
                ? i18n.translate('xpack.notebook.chartCell.waiting', {
                    defaultMessage: 'Waiting for the source cell to produce results.',
                  })
                : i18n.translate('xpack.notebook.chartCell.pickSource', {
                    defaultMessage: 'Pick an ES|QL cell as the source.',
                  })
            }
          />
        )}
      </div>
      {editPanel}
    </CellFrame>
  );
};
