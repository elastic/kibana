/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { VegaSpecEditor } from '@kbn/vis-type-vega-plugin/public';
import type { VegaCellDefinition } from '../../common/types';
import { getCellDisplayName } from '../model/references';
import { createStarterSpec } from '../model/vega_spec';
import type { NotebookStore } from '../model/notebook_store';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';

const SOURCE_LABEL = i18n.translate('xpack.notebook.vegaCell.source', {
  defaultMessage: 'Source',
});

/** What the flyout edits, applied to the cell together. */
export type VegaDraft = Pick<VegaCellDefinition, 'spec' | 'sourceCell'>;

interface VegaSpecFlyoutProps {
  cell: VegaCellDefinition;
  /** Shows a draft in the cell without applying it. */
  onPreview: (draft: VegaDraft) => void;
  onApply: (draft: VegaDraft) => void;
  onClose: () => void;
}

/** A starter chart of the source's results, for a blank spec. */
const starterFor = (store: NotebookStore, sourceCell: string | null): string => {
  const output = sourceCell ? store.getRuntime(sourceCell).output : undefined;
  return output?.kind === 'table' ? createStarterSpec(output.table) : '';
};

/** Edits a Vega cell's source and spec with Kibana's Vega editor, previewing drafts in the cell before applying them. */
export const VegaSpecFlyout = ({ cell, onPreview, onApply, onClose }: VegaSpecFlyoutProps) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const titleId = useGeneratedHtmlId({ prefix: 'notebookVegaFlyoutTitle' });
  const [saved] = useState<VegaDraft>(() => ({ spec: cell.spec, sourceCell: cell.sourceCell }));
  const [draft, setDraft] = useState<VegaDraft>(() => ({
    ...saved,
    spec: saved.spec.trim() ? saved.spec : starterFor(store, saved.sourceCell),
  }));
  const [previewed, setPreviewed] = useState(saved);
  const esqlCells = cellOrder.flatMap((cellId) => {
    const other = cells[cellId];
    return other?.type === 'esql' ? [other] : [];
  });

  const isSame = (left: VegaDraft, right: VegaDraft) =>
    left.spec === right.spec && left.sourceCell === right.sourceCell;

  const selectSource = (sourceCell: string | null) =>
    setDraft((current) => ({
      sourceCell,
      spec: current.spec.trim() ? current.spec : starterFor(store, sourceCell),
    }));

  const preview = () => {
    onPreview(draft);
    setPreviewed(draft);
  };

  const editorCss = css`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
  `;

  return (
    <NotebookFlyout
      type="push"
      ownFocus
      outsideClickCloses={false}
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="notebookVegaEditFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {i18n.translate('xpack.notebook.vegaCell.flyout.title', {
              defaultMessage: 'Edit Vega spec',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiSelect
          compressed
          fullWidth
          prepend={SOURCE_LABEL}
          aria-label={SOURCE_LABEL}
          hasNoInitialSelection={!draft.sourceCell}
          value={draft.sourceCell ?? ''}
          options={esqlCells.map((esqlCell) => ({
            value: esqlCell.id,
            text: getCellDisplayName(esqlCell),
          }))}
          onChange={(event) => selectSource(event.target.value || null)}
          data-test-subj="notebookVegaSource"
        />
      </EuiFlyoutHeader>

      <div css={editorCss} data-test-subj="notebookVegaFlyoutBody">
        <Suspense
          fallback={
            <EuiSkeletonText
              lines={3}
              aria-label={i18n.translate('xpack.notebook.vegaCell.flyout.loading', {
                defaultMessage: 'Loading Vega editor',
              })}
            />
          }
        >
          <VegaSpecEditor
            editorValue={draft.spec}
            onChange={(spec) => setDraft((current) => ({ ...current, spec }))}
            actionsPlacement="toolbar"
          />
        </Suspense>
      </div>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="notebookVegaCancel">
              {i18n.translate('xpack.notebook.vegaCell.flyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  iconType="play"
                  disabled={isSame(draft, previewed)}
                  onClick={preview}
                  data-test-subj="notebookVegaRunPreview"
                >
                  {i18n.translate('xpack.notebook.vegaCell.flyout.runPreview', {
                    defaultMessage: 'Run preview',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  disabled={isSame(draft, saved)}
                  onClick={() => onApply(draft)}
                  data-test-subj="notebookVegaApply"
                >
                  {i18n.translate('xpack.notebook.vegaCell.flyout.apply', {
                    defaultMessage: 'Apply and close',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </NotebookFlyout>
  );
};
