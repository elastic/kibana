/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useEffect, useState, MutableRefObject } from 'react';
import { Editor as AceEditor } from 'brace';

import { initializeEditor } from './init_editor';
import { useUIAceKeyboardMode } from './use_ui_ace_keyboard_mode';

export interface Props {
  licenseEnabled: boolean;
  initialValue: string;
  /**
   * Hack to expose the editor instance's getValue(). This could be probably be better placed
   * in React.Context.
   */
  valueGetterRef: MutableRefObject<() => string | null>;
}

export const Editor = ({ licenseEnabled, initialValue, valueGetterRef }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null as any);
  const editorInstanceRef = useRef<AceEditor>(null as any);
  const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);
  useUIAceKeyboardMode(textArea);
  useEffect(() => {
    const divEl = containerRef.current;
    editorInstanceRef.current = initializeEditor({ el: divEl, licenseEnabled });
    editorInstanceRef.current.setValue(initialValue, 1);
    valueGetterRef.current = () => editorInstanceRef.current.getValue() as string;
    setTextArea(containerRef.current!.querySelector('textarea'));
  });
  return <div ref={containerRef} />;
};
