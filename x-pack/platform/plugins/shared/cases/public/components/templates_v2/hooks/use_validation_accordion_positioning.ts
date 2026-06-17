/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { monaco } from '@kbn/monaco';
import type { ValidationError } from '../components/template_yaml_validation_accordion';

interface UseValidationAccordionPositioningReturn {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  accordionRef: React.MutableRefObject<HTMLDivElement | null>;
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  containerBounds: { left: number; width: number };
  accordionHeight: number;
  portalNode: HTMLElement | null;
  validationErrors: ValidationError[];
  isEditorMounted: boolean;
  handleValidationChange: (errors: ValidationError[]) => void;
  handleEditorMount: (isMounted: boolean, editor?: monaco.editor.IStandaloneCodeEditor) => void;
  handleErrorClick: (error: ValidationError) => void;
}

export const useValidationAccordionPositioning = (): UseValidationAccordionPositioningReturn => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const accordionRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [containerBounds, setContainerBounds] = useState({ left: 0, width: 0 });
  const [accordionHeight, setAccordionHeight] = useState(70);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const handleValidationChange = useCallback((errors: ValidationError[]) => {
    setValidationErrors(errors);
  }, []);

  const handleEditorMount = useCallback(
    (isMounted: boolean, editor?: monaco.editor.IStandaloneCodeEditor) => {
      setIsEditorMounted(isMounted);
      if (editor) {
        editorRef.current = editor;
      }
    },
    []
  );

  const handleErrorClick = useCallback((error: ValidationError) => {
    if (editorRef.current) {
      editorRef.current.setPosition({
        lineNumber: error.startLineNumber,
        column: error.startColumn,
      });
      editorRef.current.revealLineInCenter(error.startLineNumber);
      editorRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const portalContainer = document.createElement('div');
    portalContainer.id = 'template-validation-portal';
    document.body.appendChild(portalContainer);
    setPortalNode(portalContainer);

    return () => {
      if (portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }
    };
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateBounds = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerBounds({ left: rect.left, width: rect.width + 24 });
      }
      if (accordionRef.current) {
        const height = accordionRef.current.offsetHeight;
        setAccordionHeight(height || 70);
      }
    };

    const throttledUpdateBounds = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBounds, 100);
    };

    updateBounds();
    window.addEventListener('resize', throttledUpdateBounds);
    window.addEventListener('scroll', throttledUpdateBounds, true);

    const observer = new MutationObserver(throttledUpdateBounds);
    if (accordionRef.current) {
      observer.observe(accordionRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', throttledUpdateBounds);
      window.removeEventListener('scroll', throttledUpdateBounds, true);
      observer.disconnect();
    };
  }, [portalNode]);

  return {
    containerRef,
    accordionRef,
    editorRef,
    containerBounds,
    accordionHeight,
    portalNode,
    validationErrors,
    isEditorMounted,
    handleValidationChange,
    handleEditorMount,
    handleErrorClick,
  };
};
