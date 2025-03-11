/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { some } from 'lodash';
import useDebounce from 'react-use/lib/useDebounce';
import type { ContextShape } from '@elastic/eui/src/components/markdown_editor/markdown_context';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EuiMarkdownAstNode, EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import { VISUALIZATION } from './translations';
import { PREFIX } from './constants';

const DISABLED_CLASSNAME = 'euiButtonIcon-isDisabled';

interface MarkdownEditorRef {
  textarea: HTMLTextAreaElement | null;
  replaceNode: ContextShape['replaceNode'];
  toolbar: HTMLDivElement | null;
}

interface UseLensButtonToggleProps {
  astRef?: React.MutableRefObject<EuiMarkdownAstNode | undefined>;
  uiPlugins?: EuiMarkdownEditorUiPlugin[] | undefined;
  editorRef?: React.MutableRefObject<MarkdownEditorRef | null>;
  value?: string;
}

export const useLensButtonToggle = ({
  astRef,
  editorRef,
  uiPlugins,
  value,
}: UseLensButtonToggleProps) => {
  const lensPluginAvailable = useRef(false);
  const [lensNodeSelected, setLensNodeSelected] = useState(false);

  const enableLensButton = useCallback(() => {
    if (editorRef?.current?.textarea && editorRef.current?.toolbar) {
      const lensPluginButton = editorRef.current?.toolbar?.querySelector(
        `[aria-label="${VISUALIZATION}"]`
      );

      if (lensPluginButton) {
        const isDisabled = lensPluginButton.className.includes(DISABLED_CLASSNAME);
        const buttonStyle = lensPluginButton.getAttribute('style');
        if (isDisabled && buttonStyle) {
          lensPluginButton.className = lensPluginButton.className.replace(DISABLED_CLASSNAME, '');
          lensPluginButton.setAttribute('style', buttonStyle.replace('pointer-events: none;', ''));
        }
      }
    }
  }, [editorRef]);

  const disableLensButton = useCallback(() => {
    if (editorRef?.current?.textarea && editorRef.current.toolbar) {
      const lensPluginButton = editorRef.current.toolbar?.querySelector(
        `[aria-label="${VISUALIZATION}"]`
      );

      if (lensPluginButton) {
        const isDisabled = lensPluginButton.className.includes(DISABLED_CLASSNAME);

        if (!isDisabled) {
          lensPluginButton.className += ` ${DISABLED_CLASSNAME}`;
          lensPluginButton.setAttribute('style', 'pointer-events: none;');
        }
      }
    }
  }, [editorRef]);

  useEffect(() => {
    lensPluginAvailable.current = some(uiPlugins, ['name', 'lens']);
  }, [uiPlugins]);

  useDebounce(
    () => {
      if (lensNodeSelected || !value?.includes(PREFIX)) {
        enableLensButton();
      } else {
        disableLensButton();
      }
    },
    100,
    [value, lensNodeSelected]
  );

  // Copied from https://github.com/elastic/eui/blob/main/packages/eui/src/components/markdown_editor/markdown_editor.tsx#L286
  useEffect(() => {
    if (
      editorRef?.current?.textarea == null ||
      astRef?.current == null ||
      !lensPluginAvailable.current
    ) {
      return;
    }

    const getCursorNode = () => {
      const { selectionStart } = editorRef.current?.textarea!;

      let node: EuiMarkdownAstNode = astRef.current!;

      outer: while (true) {
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (
              child.position &&
              child.position.start.offset < selectionStart &&
              selectionStart < child.position.end.offset
            ) {
              if (child.type === 'text') break outer; // don't dive into `text` nodes
              node = child;
              // eslint-disable-next-line no-continue
              continue outer;
            }
          }
        }
        break;
      }

      setLensNodeSelected(node.type === 'lens');
    };

    const textarea = editorRef.current?.textarea;

    textarea.addEventListener('keyup', getCursorNode);
    textarea.addEventListener('mouseup', getCursorNode);

    return () => {
      textarea.removeEventListener('keyup', getCursorNode);
      textarea.removeEventListener('mouseup', getCursorNode);
    };
  }, [astRef, editorRef]);
};
