/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/code-editor';
import { prettifyQuery } from '@kbn/esql-utils';

const PRETTIFY_LABEL = i18n.translate('xpack.alertingV2.composeDiscover.esql.prettifyQueryLabel', {
  defaultMessage: 'Prettify query',
});

// Fallback pixel width of one monospace character, used only if Monaco's measured
// `typicalHalfwidthCharacterWidth` is unavailable (0/undefined). ~8px matches the
// editor's default 14px font, and just guards against dividing by zero when
// computing the line-wrap width — the exact value is not important.
const DEFAULT_CHAR_WIDTH = 8;

/**
 * Registers a Cmd/Ctrl+I "Prettify query" action on an ES|QL editor. The action is
 * scoped to the editor (via `addAction`, not a page-wide keybinding), and wraps the
 * query to the editor's visible width.
 *
 * Reformatting is best-effort: content that doesn't parse on its own (e.g. a
 * split-query fragment like `| WHERE ...`) is left untouched.
 */
export const addPrettifyAction = (
  editor: monaco.editor.IStandaloneCodeEditor
): monaco.IDisposable =>
  editor.addAction({
    id: 'alertingV2.esql.prettifyQuery',
    label: PRETTIFY_LABEL,
    // eslint-disable-next-line no-bitwise
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
    run: (ed) => {
      const model = ed.getModel();
      const query = ed.getValue();
      if (!model || !query.trim()) {
        return;
      }

      const contentWidth = ed.getLayoutInfo().contentWidth;
      const charWidth =
        ed.getOption(monaco.editor.EditorOption.fontInfo).typicalHalfwidthCharacterWidth ||
        DEFAULT_CHAR_WIDTH;
      const lineWidthChars = contentWidth > 0 ? Math.floor(contentWidth / charWidth) : undefined;

      let pretty: string;
      try {
        pretty = prettifyQuery(query, lineWidthChars);
      } catch {
        // Invalid query that can't be parsed — leave it as is.
        return;
      }

      // A partial/fragment query (e.g. `| WHERE ...` in a split alert/recovery block)
      // can't be parsed on its own, and `prettifyQuery` returns an empty string for it.
      // Guard against that so we never wipe the editor's content.
      if (pretty.trim() && pretty !== query) {
        ed.executeEdits('alertingV2.esql.prettify', [
          { range: model.getFullModelRange(), text: pretty },
        ]);
      }
    },
  });
