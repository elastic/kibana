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
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { VegaSpecEditor } from '@kbn/vis-type-vega-plugin/public';
import type { VegaCellDefinition } from '../../common/types';
import { getCellDisplayName } from '../model/references';
import { createStarterSpec, VEGA_TABLE_DATASET } from '../model/vega_spec';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';

interface VegaSpecFlyoutProps {
  cell: VegaCellDefinition;
  /** Shows a draft spec in the cell without applying it. */
  onPreview: (spec: string) => void;
  onApply: (spec: string) => void;
  onClose: () => void;
}

/** Edits a Vega cell's spec with Kibana's Vega editor, previewing drafts in the cell before applying them. */
export const VegaSpecFlyout = ({ cell, onPreview, onApply, onClose }: VegaSpecFlyoutProps) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const titleId = useGeneratedHtmlId({ prefix: 'notebookVegaFlyoutTitle' });
  const [draft, setDraft] = useState(() => {
    if (cell.spec.trim() || runtime.output?.kind !== 'table') return cell.spec;
    return createStarterSpec(runtime.output.table);
  });
  const [previewed, setPreviewed] = useState(cell.spec);
  const source = cell.sourceCell ? cells[cell.sourceCell] : undefined;

  const editorCss = css`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
  `;

  const preview = () => {
    onPreview(draft);
    setPreviewed(draft);
  };

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
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {source ? (
              <FormattedMessage
                id="xpack.notebook.vegaCell.flyout.description"
                defaultMessage="Chart the results of {source} with Vega or Vega-Lite. They're the {dataset} dataset."
                values={{
                  source: getCellDisplayName(source),
                  dataset: <EuiCode>{VEGA_TABLE_DATASET}</EuiCode>,
                }}
              />
            ) : (
              i18n.translate('xpack.notebook.vegaCell.flyout.descriptionNoSource', {
                defaultMessage: 'Chart your data with Vega or Vega-Lite.',
              })
            )}
          </p>
        </EuiText>
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
          <VegaSpecEditor editorValue={draft} onChange={setDraft} actionsPlacement="toolbar" />
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
                  disabled={draft === previewed}
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
                  disabled={draft === cell.spec}
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
