/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useRef, useEffect, useState } from 'react';
import ace, { Editor as AceEditor } from 'brace';

const _AceRange = ace.acequire('ace/range').Range;

import { initializeEditor } from './init_editor';
import { useUIAceKeyboardMode } from './use_ui_ace_keyboard_mode';

interface EditorShim {
  addErrorAnnotation: (pos: { row: number }) => void;
  clearErrorAnnotations: () => void;
  getValue(): string;
  focus(): void;
}

export type EditorInstance = EditorShim;

export interface Props {
  licenseEnabled: boolean;
  initialValue: string;
  onEditorReady: (editor: EditorShim) => void;
}

const clearErrorAnnotations = (aceEditor: AceEditor) => {
  const markerIds = aceEditor.session.getMarkers(true);
  if (markerIds) {
    Object.keys(markerIds).forEach(id => aceEditor.session.removeMarker(parseInt(id, 10)));
  }
};

const createEditorShim = (aceEditor: AceEditor): EditorShim => {
  return {
    clearErrorAnnotations() {
      clearErrorAnnotations(aceEditor);
    },
    addErrorAnnotation({ row }) {
      const lineLength = aceEditor.session.getLine(row).length - 1;
      aceEditor.session.addMarker(
        new _AceRange(row, 0, row, lineLength),
        'errorMarker',
        'fullLine',
        true
      );
    },
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
    editorInstanceRef.current.on('change', () => {
      clearErrorAnnotations(editorInstanceRef.current);
    });
    setTextArea(containerRef.current!.querySelector('textarea'));

    onEditorReady(createEditorShim(editorInstanceRef.current));
  }, []);

  return <div ref={containerRef} />;
});
