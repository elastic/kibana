/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiAccordion,
  EuiButton,
  EuiEmptyPrompt,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { VegaCellDefinition } from '../../common/types';
import { getCellDisplayName } from '../model/references';
import { createStarterSpec, VEGA_TABLE_DATASET } from '../model/vega_spec';
import { CellFrame } from './cell_frame';
import { useCellResize } from './cell_resize';
import { useNotebook } from './notebook_context';
import { VegaChart } from './vega_chart';

const CELL_HEIGHT = 300;
const SPEC_SAVE_DELAY_MS = 400;
const FIT_TO_CONTENT = { minLines: 6, maxLines: 30 };

const SOURCE_LABEL = i18n.translate('xpack.notebook.vegaCell.source', {
  defaultMessage: 'Source',
});
const SPEC_LABEL = i18n.translate('xpack.notebook.vegaCell.spec', {
  defaultMessage: 'Spec',
});
const PLACEHOLDER = i18n.translate('xpack.notebook.vegaCell.placeholder', {
  defaultMessage:
    'Vega or Vega-Lite JSON. The source results are the "{dataset}" dataset; a $schema mentioning vega-lite selects Vega-Lite.',
  values: { dataset: VEGA_TABLE_DATASET },
});

/** The chart, or a prompt explaining why there is none yet. */
export const VegaCanvas = ({
  cell,
  onStart,
}: {
  cell: VegaCellDefinition;
  /** Offered while the spec is empty, to start from a chart of the results. */
  onStart?: (spec: string) => void;
}) => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const table = runtime.output?.kind === 'table' ? runtime.output.table : undefined;

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
  if (!cell.spec.trim()) {
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
  return <VegaChart spec={cell.spec} table={table} />;
};

export const VegaCell = ({ cell }: { cell: VegaCellDefinition }) => {
  const { store, scheduler } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const { bodyCss, resizeHandle } = useCellResize(cell, CELL_HEIGHT);
  const [draft, setDraft] = useState(cell.spec);
  const { id } = cell;

  useEffect(() => setDraft(cell.spec), [cell.spec]);

  const update = (patch: Partial<Pick<VegaCellDefinition, 'spec' | 'sourceCell'>>) =>
    store.updateCell(id, (current) =>
      current.type === 'vega' ? { ...current, ...patch } : current
    );

  useDebounce(
    () => {
      const current = store.getCell(id);
      if (current?.type === 'vega' && draft !== current.spec) update({ spec: draft });
    },
    SPEC_SAVE_DELAY_MS,
    [draft]
  );

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
      <EuiAccordion
        id={`notebookVegaSpec-${id}`}
        initialIsOpen
        paddingSize="none"
        buttonContent={
          <EuiText size="xs">
            <strong>{SPEC_LABEL}</strong>
          </EuiText>
        }
        data-test-subj="notebookVegaSpecToggle"
      >
        <EuiSpacer size="xs" />
        <CodeEditor
          languageId="json"
          value={draft}
          onChange={setDraft}
          placeholder={PLACEHOLDER}
          fitToContent={FIT_TO_CONTENT}
          options={{
            fontSize: 12,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
          dataTestSubj={`notebookVegaEditor-${cell.name}`}
        />
      </EuiAccordion>
      <EuiSpacer size="s" />
      <div css={bodyCss} data-test-subj="notebookVegaContainer">
        <VegaCanvas cell={cell} onStart={(spec) => update({ spec })} />
      </div>
    </CellFrame>
  );
};
