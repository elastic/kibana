/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElementRef } from 'react';
import React, { memo, forwardRef, useCallback, useRef, useState, useImperativeHandle } from 'react';
import type { EuiMarkdownEditorProps, EuiMarkdownAstNode } from '@elastic/eui';
import { EuiMarkdownEditor } from '@elastic/eui';
import { usePlugins } from './use_plugins';
import { useLensButtonToggle } from './plugins/lens/use_lens_button_toggle';
import { type EditorBaseProps, type MarkdownEditorRef } from './types';
import { scaledMarkdownImages } from '../utils';

interface MarkdownEditorProps extends EditorBaseProps {
  height?: number;
  onChange: (content: string) => void;
  value: string;
}

export type EuiMarkdownEditorRef = ElementRef<typeof EuiMarkdownEditor>;

const MarkdownEditorComponent = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  (
    {
      ariaLabel,
      'data-test-subj': dataTestSubj,
      editorId,
      height,
      onChange,
      value,
      disabledUiPlugins,
      errors,
      ...props
    },
    ref
  ) => {
    const astRef = useRef<EuiMarkdownAstNode | undefined>(undefined);
    const [markdownErrorMessages, setMarkdownErrorMessages] = useState<Array<string | Error>>([]);
    const onParse = useCallback<NonNullable<EuiMarkdownEditorProps['onParse']>>(
      (err, { messages, ast }) => {
        setMarkdownErrorMessages(err ? [err] : messages);
        astRef.current = ast;
      },
      []
    );

    const { parsingPlugins, processingPlugins, uiPlugins } = usePlugins(disabledUiPlugins);
    const editorRef = useRef<EuiMarkdownEditorRef>(null);

    useLensButtonToggle({
      astRef,
      uiPlugins,
      editorRef: ref as React.MutableRefObject<MarkdownEditorRef>,
      value,
    });

    // @ts-expect-error
    useImperativeHandle(ref, () => {
      if (!editorRef.current) {
        return null;
      }

      const editorNode = editorRef.current?.textarea?.closest('.euiMarkdownEditor');

      return {
        ...editorRef.current,
        toolbar: editorNode?.querySelector('.euiMarkdownEditorToolbar'),
      };
    });

    return (
      <EuiMarkdownEditor
        // prevent images from displaying at full scale
        css={scaledMarkdownImages}
        ref={editorRef}
        aria-label={ariaLabel}
        editorId={editorId}
        onChange={onChange}
        value={value}
        uiPlugins={uiPlugins}
        parsingPluginList={parsingPlugins}
        processingPluginList={processingPlugins}
        onParse={onParse}
        errors={[...markdownErrorMessages, ...(errors ?? [])]}
        data-test-subj={dataTestSubj}
        height={height}
        {...props} // inherit aria props for accessibility
      />
    );
  }
);

MarkdownEditorComponent.displayName = 'MarkdownEditor';

export const MarkdownEditor = memo(MarkdownEditorComponent);
