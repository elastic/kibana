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
    editor: monaco.editor.IStandaloneCodeEditor,
    options: { flyoutMode?: boolean } = {}
  ) => {
    if (resizeChecker.current) {
      resizeChecker.current.destroy();
    }
    
    let targetElement = divElement;
    
    if (options.flyoutMode) {
      const flyoutElement = divElement.closest('.euiFlyout') as HTMLDivElement;
      if (flyoutElement) {
        targetElement = flyoutElement;
      }
    }
    
    resizeChecker.current = new ResizeChecker(targetElement);
    resizeChecker.current.on('resize', () => {
      if (options.flyoutMode) {
        const flyoutRect = targetElement.getBoundingClientRect();
        const availableWidth = flyoutRect.width - 120;
        
        divElement.style.width = `${availableWidth}px`;
        divElement.style.maxWidth = `${availableWidth}px`;
        
        const containerRect = divElement.getBoundingClientRect();
        editor.layout({ width: availableWidth, height: containerRect.height });
      } else {
        editor.layout();
      }
    });
  };

  const destroyResizeChecker = () => {
    if (resizeChecker.current) {
      resizeChecker.current.destroy();
    }
  };

  return { setupResizeChecker, destroyResizeChecker };
};
