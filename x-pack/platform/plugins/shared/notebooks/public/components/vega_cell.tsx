/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { VegaCellDefinition } from '../../common/types';
import { getCellDisplayName } from '../model/references';
import { createStarterSpec } from '../model/vega_spec';
import { CellFrame } from './cell_frame';
import { useCellResize } from './cell_resize';
import { useNotebook } from './notebook_context';
import { VegaChart } from './vega_chart';
import { VegaSpecFlyout } from './vega_spec_flyout';

const CELL_HEIGHT = 300;

const SOURCE_LABEL = i18n.translate('xpack.notebook.vegaCell.source', {
  defaultMessage: 'Source',
});

/** The chart, or a prompt explaining why there is none yet. */
export const VegaCanvas = ({
  cell,
  preview,
  onStart,
}: {
  cell: VegaCellDefinition;
  /** A draft spec shown in place of the cell's own. */
  preview?: string;
  /** Offered while the spec is empty, to start from a chart of the results. */
  onStart?: (spec: string) => void;
}) => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const table = runtime.output?.kind === 'table' ? runtime.output.table : undefined;
  const spec = preview ?? cell.spec;

  if (cell.sourceCell === null) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        body={i18n.translate('xpack.notebook.vegaCell.noSource', {
          defaultMessage: 'Pick the ES|QL cell whose results to chart.',
        })}
      />
    );
  }
  if (!table) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        body={i18n.translate('xpack.notebook.vegaCell.waiting', {
          defaultMessage: 'Waiting for the source cell to produce results.',
        })}
      />
    );
  }
  if (!spec.trim()) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        body={i18n.translate('xpack.notebook.vegaCell.noSpec', {
          defaultMessage: 'Write a Vega or Vega-Lite spec to chart the results.',
        })}
        actions={
          onStart && (
            <EuiButton
              size="s"
              iconType="chartArea"
              onClick={() => onStart(createStarterSpec(table))}
              data-test-subj="notebookVegaStart"
            >
              {i18n.translate('xpack.notebook.vegaCell.start', {
                defaultMessage: 'Start from the results',
              })}
            </EuiButton>
          )
        }
      />
    );
  }
  return <VegaChart spec={spec} table={table} />;
};

export const VegaCell = ({ cell }: { cell: VegaCellDefinition }) => {
  const { store, scheduler } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const { bodyCss, resizeHandle } = useCellResize(cell, CELL_HEIGHT);
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState<string>();
  const { id } = cell;

  const update = (patch: Partial<Pick<VegaCellDefinition, 'spec' | 'sourceCell'>>) =>
    store.updateCell(id, (current) =>
      current.type === 'vega' ? { ...current, ...patch } : current
    );

  const closeEditor = useCallback(() => {
    setIsEditing(false);
    setPreview(undefined);
  }, []);

  const esqlCells = cellOrder.flatMap((cellId) => {
    const other = cells[cellId];
    return other?.type === 'esql' ? [other] : [];
  });

  return (
    <CellFrame
      cell={cell}
      runtime={runtime}
      resizeHandle={resizeHandle}
      onRun={() => scheduler.runCell(id)}
      headerActions={
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="pencil"
            onClick={() => setIsEditing(true)}
            data-test-subj="notebookVegaEdit"
          >
            {i18n.translate('xpack.notebook.vegaCell.edit', { defaultMessage: 'Edit' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      }
    >
      <EuiSelect
        compressed
        fullWidth
        prepend={SOURCE_LABEL}
        aria-label={SOURCE_LABEL}
        hasNoInitialSelection={!cell.sourceCell}
        value={cell.sourceCell ?? ''}
        options={esqlCells.map((esqlCell) => ({
          value: esqlCell.id,
          text: getCellDisplayName(esqlCell),
        }))}
        onChange={(event) => update({ sourceCell: event.target.value || null })}
        data-test-subj="notebookVegaSource"
      />
      <EuiSpacer size="s" />
      <div css={bodyCss} data-test-subj="notebookVegaContainer">
        <VegaCanvas cell={cell} preview={preview} onStart={(spec) => update({ spec })} />
      </div>
      {isEditing && (
        <VegaSpecFlyout
          cell={cell}
          onPreview={setPreview}
          onApply={(spec) => {
            update({ spec });
            closeEditor();
          }}
          onClose={closeEditor}
        />
      )}
    </CellFrame>
  );
};
