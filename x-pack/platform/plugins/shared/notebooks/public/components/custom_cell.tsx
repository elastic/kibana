/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiEmptyPrompt, EuiFlexItem, useEuiTheme } from '@elastic/eui';
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
import { getCellDisplayName, getOwnQuery } from '../model/references';
import { useNotebookServices } from '../services';
import { CellFrame } from './cell_frame';
import {
  CustomCellFlyout,
  GenerateWithChatButton,
  toDraft,
  type CustomCellDraft,
  type TemplatePreview,
} from './custom_cell_flyout';
import { useNotebook } from './notebook_context';

const IFRAME_TITLE = i18n.translate('xpack.notebook.customCell.iframeTitle', {
  defaultMessage: 'Custom panel',
});

const cellContainerCss = css`
  height: 300px;
  min-height: 300px;
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
  preview,
  onGenerateWithChat,
}: {
  cell: CustomCellDefinition;
  /** A draft from the edit flyout, shown in place of the applied template and data. */
  preview?: TemplatePreview;
  /** Offered in the prompt while there is no template. */
  onGenerateWithChat?: () => void;
}) => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const table = runtime.output?.kind === 'table' ? runtime.output.table : undefined;
  const template = preview?.template ?? cell.template;
  const ownQuery = getOwnQuery(cell);
  const hasData = ownQuery === undefined ? cell.sourceCell !== null : Boolean(ownQuery.trim());
  const isWaiting = !preview && hasData && !table;
  const { html, error } = useCustomHtml(template, preview ? preview.table : table);

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
          isWaiting && ownQuery !== undefined
            ? i18n.translate('xpack.notebook.customCell.waitingForQuery', {
                defaultMessage: 'Run the query to fill the template.',
              })
            : isWaiting
            ? i18n.translate('xpack.notebook.customCell.waiting', {
                defaultMessage: 'Waiting for the source cell to produce results.',
              })
            : i18n.translate('xpack.notebook.customCell.noTemplate', {
                defaultMessage: 'Edit the panel to pick its data and write an HTML template.',
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
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState<TemplatePreview>();
  const panelChat = plugins.customContent?.panelChat;
  const { id } = cell;

  /** Applies the edited fields; switching source re-runs the cell, but editing its own query alone does not. */
  const applyDraft = useCallback(
    (draft: Partial<CustomCellDraft>) => {
      const current = store.cells$.getValue()[id];
      if (current?.type !== 'custom') return;
      const next = { ...current, ...draft };
      store.updateCell(id, () => next);
      const currentQuery = getOwnQuery(current);
      const nextQuery = getOwnQuery(next);
      if (currentQuery !== undefined && nextQuery !== undefined && nextQuery !== currentQuery) {
        void scheduler.runCell(id);
      }
    },
    [store, scheduler, id]
  );

  // The source cell may feed other cells, so a query the agent proposes for it moves to the panel instead.
  useEffect(
    () =>
      panelChat?.watch(id, ({ template, esqlQuery }) => {
        const current = store.cells$.getValue()[id];
        if (current?.type !== 'custom') return;
        if (esqlQuery === undefined) {
          applyDraft({ template });
          return;
        }
        if (getOwnQuery(current) !== undefined) {
          applyDraft({ template, query: esqlQuery });
          return;
        }
        const source = current.sourceCell ? store.cells$.getValue()[current.sourceCell] : undefined;
        if (source?.type === 'esql' && source.query === esqlQuery) {
          applyDraft({ template });
          return;
        }
        applyDraft({ template, dataSource: 'query', query: esqlQuery });
      }),
    [panelChat, id, store, applyDraft]
  );

  const closeEditor = useCallback(() => {
    setIsEditing(false);
    setPreview(undefined);
  }, []);

  const generateWithChat = useCallback(
    ({ template, ...data }: CustomCellDraft) => {
      if (!panelChat) return;
      closeEditor();
      applyDraft(data);
      const { cells$ } = store;
      const source = data.sourceCell ? cells$.getValue()[data.sourceCell] : undefined;
      const sourceQuery = source?.type === 'esql' ? source.query : undefined;
      const isOwnQuery = data.dataSource === 'query';
      panelChat.open({
        panelId: id,
        title: getCellDisplayName(cell),
        template,
        esqlQuery: isOwnQuery ? data.query : sourceQuery,
        esqlQuerySource:
          !isOwnQuery && source ? `the notebook cell "${getCellDisplayName(source)}"` : undefined,
        ...toQueryContext(runtime.runParams),
      });
    },
    [panelChat, closeEditor, applyDraft, store, id, cell, runtime.runParams]
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
      <div css={cellContainerCss} data-test-subj="notebookCustomContainer">
        <CustomCanvas
          cell={cell}
          preview={preview}
          onGenerateWithChat={panelChat ? () => generateWithChat(toDraft(cell)) : undefined}
        />
      </div>
      {isEditing && (
        <CustomCellFlyout
          cell={cell}
          onPreview={setPreview}
          onApply={(draft) => {
            applyDraft(draft);
            closeEditor();
          }}
          onClose={closeEditor}
          onGenerateWithChat={panelChat ? generateWithChat : undefined}
        />
      )}
    </CellFrame>
  );
};
