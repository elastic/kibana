/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  applyHtmlTheme,
  fillTemplate,
  getLinkBasePath,
  sanitizeHtml,
} from '@kbn/custom-content-renderer';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CustomCellDefinition } from '../../common/types';
import { toQueryContext, toTemplateData } from '../model/custom_template';
import { getCellDisplayName } from '../model/references';
import { useNotebookServices } from '../services';
import { CellFrame } from './cell_frame';
import { CustomCellFlyout, GenerateWithChatButton } from './custom_cell_flyout';
import { useNotebook } from './notebook_context';

const SOURCE_LABEL = i18n.translate('xpack.notebook.customCell.source', {
  defaultMessage: 'Source',
});

const IFRAME_TITLE = i18n.translate('xpack.notebook.customCell.iframeTitle', {
  defaultMessage: 'Custom panel',
});

const cellContainerCss = css`
  height: 300px;
  min-height: 120px;
  resize: vertical;
  overflow: hidden;
`;

const iframeCss = css`
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
`;

interface RenderedHtml {
  html?: string;
  error?: string;
}

/** The template filled with the table, sanitised and themed for a sandboxed iframe. */
const useCustomHtml = (template: string, table: Datatable | undefined): RenderedHtml => {
  const { core } = useNotebookServices();
  const { euiTheme, colorMode } = useEuiTheme();
  const [rendered, setRendered] = useState<RenderedHtml>({});

  useEffect(() => {
    if (!template.trim()) {
      setRendered({});
      return;
    }
    let isCurrent = true;
    const { columns, rows } = table ? toTemplateData(table) : { columns: [], rows: [] };
    fillTemplate(template, columns, rows)
      .then((raw) => {
        if (!isCurrent) return;
        const html = sanitizeHtml(raw, getLinkBasePath(core.http), false);
        setRendered({ html: applyHtmlTheme(html, colorMode, euiTheme) });
      })
      .catch((error: Error) => {
        if (isCurrent) setRendered({ error: error.message });
      });
    return () => {
      isCurrent = false;
    };
  }, [template, table, core.http, colorMode, euiTheme]);

  return rendered;
};

/** The rendered custom panel, or a prompt explaining why there is none yet. */
export const CustomCanvas = ({
  cell,
  previewTemplate,
  onGenerateWithChat,
}: {
  cell: CustomCellDefinition;
  previewTemplate?: string;
  /** Offered in the prompt while there is no template. */
  onGenerateWithChat?: () => void;
}) => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const table = runtime.output?.kind === 'table' ? runtime.output.table : undefined;
  const template = previewTemplate ?? cell.template;
  const isWaiting = cell.sourceCell !== null && !table;
  const { html, error } = useCustomHtml(template, isWaiting ? undefined : table);

  if (error) {
    return (
      <KbnDangerCallout
        announceOnMount
        size="s"
        title={i18n.translate('xpack.notebook.customCell.renderError', {
          defaultMessage: 'Failed to render the template',
        })}
      >
        {error}
      </KbnDangerCallout>
    );
  }
  if (isWaiting || !template.trim() || html === undefined) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        body={
          isWaiting
            ? i18n.translate('xpack.notebook.customCell.waiting', {
                defaultMessage: 'Waiting for the source cell to produce results.',
              })
            : i18n.translate('xpack.notebook.customCell.noTemplate', {
                defaultMessage: 'Edit the panel to write an HTML template for the results.',
              })
        }
        actions={
          !isWaiting && onGenerateWithChat ? (
            <GenerateWithChatButton hasTemplate={false} onClick={onGenerateWithChat} />
          ) : undefined
        }
      />
    );
  }
  return <iframe css={iframeCss} srcDoc={html} sandbox="" title={IFRAME_TITLE} />;
};

export const CustomCell = ({ cell }: { cell: CustomCellDefinition }) => {
  const { plugins } = useNotebookServices();
  const { store, scheduler } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const cells = useStateFromPublishingSubject(store.cells$);
  const [isEditing, setIsEditing] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<string>();
  const panelChat = plugins.customContent?.panelChat;

  const { id, sourceCell, template } = cell;
  const source = sourceCell ? cells[sourceCell] : undefined;
  const table = runtime.output?.kind === 'table' ? runtime.output.table : undefined;
  const esqlCells = Object.values(cells).filter((candidate) => candidate.type === 'esql');

  const setTemplate = useCallback(
    (next: string) =>
      store.updateCell(id, (current) =>
        current.type === 'custom' ? { ...current, template: next } : current
      ),
    [store, id]
  );

  // The cell's data comes from its source cell, so a query the agent proposes is not applied.
  useEffect(
    () => panelChat?.watch(id, ({ template: generated }) => setTemplate(generated)),
    [panelChat, id, setTemplate]
  );

  const closeEditor = useCallback(() => {
    setIsEditing(false);
    setPreviewTemplate(undefined);
  }, []);

  const applyTemplate = useCallback(
    (next: string) => {
      setTemplate(next);
      closeEditor();
    },
    [setTemplate, closeEditor]
  );

  const generateWithChat = useCallback(
    (draft: string) => {
      if (!panelChat) return;
      closeEditor();
      panelChat.open({
        panelId: id,
        title: getCellDisplayName(cell),
        template: draft,
        esqlQuery: source?.type === 'esql' ? source.query : undefined,
        ...toQueryContext(runtime.runParams),
      });
    },
    [panelChat, closeEditor, id, cell, source, runtime.runParams]
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
            onClick={() => setIsEditing(true)}
            data-test-subj="notebookCustomEdit"
          >
            {i18n.translate('xpack.notebook.customCell.edit', { defaultMessage: 'Edit' })}
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
            options={esqlCells.map((esqlCell) => ({
              value: esqlCell.id,
              text: getCellDisplayName(esqlCell),
            }))}
            onChange={(event) =>
              store.updateCell(id, (current) =>
                current.type === 'custom' ? { ...current, sourceCell: event.target.value } : current
              )
            }
            data-test-subj="notebookCustomSource"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div css={cellContainerCss} data-test-subj="notebookCustomContainer">
        <CustomCanvas
          cell={cell}
          previewTemplate={previewTemplate}
          onGenerateWithChat={panelChat ? () => generateWithChat('') : undefined}
        />
      </div>
      {isEditing && (
        <CustomCellFlyout
          template={template}
          sourceName={source ? getCellDisplayName(source) : undefined}
          table={table}
          onPreview={setPreviewTemplate}
          onApply={applyTemplate}
          onClose={closeEditor}
          onGenerateWithChat={panelChat ? generateWithChat : undefined}
        />
      )}
    </CellFrame>
  );
};
