/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import type { MarkdownCellDefinition } from '../../common/types';
import { CellFrame } from './cell_frame';
import { useNotebook } from './notebook_context';

const EMPTY_PLACEHOLDER = i18n.translate('xpack.notebook.markdownCell.empty', {
  defaultMessage: 'Empty markdown cell. Click to edit.',
});

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
            <EuiMarkdownFormat textSize="s">{cell.content}</EuiMarkdownFormat>
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
          <EuiFlexGroup justifyContent="flexEnd">
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
