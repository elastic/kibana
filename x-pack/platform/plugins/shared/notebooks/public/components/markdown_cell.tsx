/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { merge, skip } from 'rxjs';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { CellDefinition, MarkdownCellDefinition } from '../../common/types';
import {
  getReferencedCellIds,
  interpolateMarkdown,
  toMarkdownScope,
  type InterpolatedMarkdown,
} from '../model/markdown_interpolation';
import { CellFrame } from './cell_frame';
import { useNotebook } from './notebook_context';

const EMPTY_PLACEHOLDER = i18n.translate('xpack.notebook.markdownCell.empty', {
  defaultMessage: 'Empty markdown cell. Click to edit.',
});

/** The note with its `{{…}}` references filled, kept current as the referenced cells change. */
const useInterpolatedMarkdown = (content: string): InterpolatedMarkdown => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const referenced = useMemo(
    () =>
      getReferencedCellIds(content, cells).flatMap((id): CellDefinition[] =>
        cells[id] ? [cells[id]] : []
      ),
    [content, cells]
  );
  const [, setRuntimeVersion] = useState(0);

  useEffect(() => {
    const subscription = merge(
      ...referenced.map(({ id }) => store.getRuntime$(id).pipe(skip(1)))
    ).subscribe(() => setRuntimeVersion((version) => version + 1));
    return () => subscription.unsubscribe();
  }, [store, referenced]);

  return interpolateMarkdown(
    content,
    toMarkdownScope(referenced, (id) => store.getRuntime(id))
  );
};

const MarkdownView = ({ content }: { content: string }) => {
  const { markdown, unknown } = useInterpolatedMarkdown(content);
  return (
    <>
      <EuiMarkdownFormat textSize="s">{markdown}</EuiMarkdownFormat>
      {unknown.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.notebook.markdownCell.unknownReferences', {
              defaultMessage:
                '{count, plural, one {Unknown reference} other {Unknown references}} {references}. Use an input name, or a cell name and column such as {example}.',
              values: {
                count: unknown.length,
                references: unknown.join(', '),
                example: '{{esql_1.count}}',
              },
            })}
            data-test-subj="notebookMarkdownUnknownReferences"
          />
        </>
      )}
    </>
  );
};

export const MarkdownCell = ({ cell }: { cell: MarkdownCellDefinition }) => {
  const { store } = useNotebook();
  const [draft, setDraft] = useState<string | null>(cell.content ? null : '');

  const finishEditing = () => {
    if (draft !== null) {
      store.updateCell(cell.id, (current) =>
        current.type === 'markdown' ? { ...current, content: draft } : current
      );
    }
    setDraft(null);
  };

  return (
    <CellFrame cell={cell}>
      {draft === null ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setDraft(cell.content)}
          onKeyDown={(event) => event.key === 'Enter' && setDraft(cell.content)}
          css={{ cursor: 'text' }}
          data-test-subj="notebookMarkdownView"
        >
          {cell.content ? (
            <MarkdownView content={cell.content} />
          ) : (
            <EuiText size="s" color="subdued">
              {EMPTY_PLACEHOLDER}
            </EuiText>
          )}
        </div>
      ) : (
        <>
          <EuiMarkdownEditor
            aria-label={i18n.translate('xpack.notebook.markdownCell.editorLabel', {
              defaultMessage: 'Markdown editor',
            })}
            value={draft}
            onChange={setDraft}
            height={200}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.notebook.markdownCell.interpolationHelp', {
                  defaultMessage:
                    'Insert values with {input} for an input, or {column} for a column of a cell’s first row.',
                  values: { input: '{{name}}', column: '{{cell.column}}' },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={finishEditing} data-test-subj="notebookMarkdownDone">
                {i18n.translate('xpack.notebook.markdownCell.done', { defaultMessage: 'Done' })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </CellFrame>
  );
};
