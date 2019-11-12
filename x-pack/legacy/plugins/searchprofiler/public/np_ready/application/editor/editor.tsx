/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useRef, useEffect, useState } from 'react';
import { Editor as AceEditor } from 'brace';

import { initializeEditor } from './init_editor';
import { useUIAceKeyboardMode } from './use_ui_ace_keyboard_mode';

interface EditorShim {
  getValue(): string;
  focus(): void;
}

export type EditorInstance = EditorShim;

export interface Props {
  licenseEnabled: boolean;
  initialValue: string;
  onEditorReady: (editor: EditorShim) => void;
}

const createEditorShim = (aceEditor: AceEditor): EditorShim => {
  return {
    getValue() {
      return aceEditor.getValue();
    },
    focus() {
      aceEditor.focus();
    },
  };
};

export const Editor = memo(({ licenseEnabled, initialValue, onEditorReady }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null as any);
  const editorInstanceRef = useRef<AceEditor>(null as any);

  const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);

  if (licenseEnabled) {
    useUIAceKeyboardMode(textArea);
  }

  useEffect(() => {
    const divEl = containerRef.current;
    editorInstanceRef.current = initializeEditor({ el: divEl, licenseEnabled });
    editorInstanceRef.current.setValue(initialValue, 1);
    setTextArea(containerRef.current!.querySelector('textarea'));

    onEditorReady(createEditorShim(editorInstanceRef.current));
  }, [initialValue, onEditorReady, licenseEnabled]);

  return <div data-test-subj="searchProfilerEditor" ref={containerRef} />;
});
