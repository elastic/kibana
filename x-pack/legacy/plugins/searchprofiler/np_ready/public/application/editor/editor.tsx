/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useEffect } from 'react';
import { Editor as AceEditor } from 'brace';

import { initializeEditor } from './init_editor';

export interface Props {
  licenseEnabled: boolean;
}

export const Editor = ({ licenseEnabled }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null as any);
  const editorInstanceRef = useRef<AceEditor>(null as any);
  useEffect(() => {
    const divEl = containerRef.current;
    editorInstanceRef.current = initializeEditor({ el: divEl, licenseEnabled });
  });
  return <div ref={containerRef} />;
};
