/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { ResizeChecker } from '@kbn/kibana-utils-plugin/public';
import type { monaco } from '@kbn/monaco';

/**
 * Hook that returns functions for setting up and destroying a {@link ResizeChecker}
 * for a Monaco editor.
 */
export const useResizeCheckerUtils = () => {
  const resizeChecker = useRef<ResizeChecker | null>(null);

  const setupResizeChecker = (
    divElement: HTMLDivElement,
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    if (resizeChecker.current) {
      resizeChecker.current.destroy();
    }
    resizeChecker.current = new ResizeChecker(divElement);
    resizeChecker.current.on('resize', () => {
      editor.layout();
    });
  };

  const destroyResizeChecker = () => {
    if (resizeChecker.current) {
      resizeChecker.current.destroy();
    }
  };

  return { setupResizeChecker, destroyResizeChecker };
};