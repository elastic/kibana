/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { VegaCellDefinition } from '../../common/types';
import { createStarterSpec } from '../model/vega_spec';
import { CellFrame } from './cell_frame';
import { useCellResize } from './cell_resize';
import { useNotebook } from './notebook_context';
import { VegaChart } from './vega_chart';
import { VegaSpecFlyout, type VegaDraft } from './vega_spec_flyout';

const CELL_HEIGHT = 300;

interface VegaCanvasProps {
  cell: VegaCellDefinition;
  /** A draft shown in place of the cell's own source and spec. */
  preview?: VegaDraft;
  /** Offered while the spec is empty, to start from a chart of the results. */
  onStart?: (spec: string) => void;
}

/** The chart, or a prompt explaining why there is none yet. */
export const VegaCanvas = ({ cell, preview, onStart }: VegaCanvasProps) => {
  const sourceCell = preview ? preview.sourceCell : cell.sourceCell;
  if (sourceCell === null) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        body={i18n.translate('xpack.notebook.vegaCell.editToPickSource', {
          defaultMessage: 'Edit the cell to pick an ES|QL cell as its source.',
        })}
      />
    );
  }
  // A draft source's results come from that cell; the cell's own run already holds its source's.
  const resultsCellId = preview ? sourceCell : cell.id;
  return (
    <VegaResults
      key={resultsCellId}
      resultsCellId={resultsCellId}
      spec={preview ? preview.spec : cell.spec}
      onStart={onStart}
    />
  );
};

const VegaResults = ({
  resultsCellId,
  spec,
  onStart,
}: {
  resultsCellId: string;
  spec: string;
  onStart?: (spec: string) => void;
}) => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(resultsCellId));
  const table = runtime.output?.kind === 'table' ? runtime.output.table : undefined;

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
  const { bodyCss, resizeHandle } = useCellResize(cell, CELL_HEIGHT);
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState<VegaDraft>();
  const { id } = cell;

  const update = (patch: Partial<VegaDraft>) =>
    store.updateCell(id, (current) =>
      current.type === 'vega' ? { ...current, ...patch } : current
    );

  const closeEditor = useCallback(() => {
    setIsEditing(false);
    setPreview(undefined);
  }, []);

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
      <div css={bodyCss} data-test-subj="notebookVegaContainer">
        <VegaCanvas cell={cell} preview={preview} onStart={(spec) => update({ spec })} />
      </div>
      {isEditing && (
        <VegaSpecFlyout
          cell={cell}
          onPreview={setPreview}
          onApply={(draft) => {
            update(draft);
            closeEditor();
          }}
          onClose={closeEditor}
        />
      )}
    </CellFrame>
  );
};
