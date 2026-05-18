/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import { monaco } from '@kbn/monaco';
import { useGetTemplate } from './use_get_template';
import { EXTENDS_CHAINING_ERROR, EXTENDS_NOT_FOUND_ERROR } from '../translations';

const EXTENDS_VALIDATION_OWNER = 'extends-validation';

export const useExtendsValidation = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  value: string
) => {
  const [extendsValue, setExtendsValue] = useState<string | undefined>(undefined);

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const parsed = parseYaml(value);
        const ext =
          parsed && typeof parsed === 'object'
            ? (parsed as Record<string, unknown>).extends
            : undefined;
        setExtendsValue(typeof ext === 'string' ? ext : undefined);
      } catch {
        setExtendsValue(undefined);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [value]);

  const {
    data: parentTemplate,
    isError,
    isFetched,
  } = useGetTemplate(extendsValue, undefined, {
    silent: true,
    includeDeleted: true,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (!extendsValue) {
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
      return;
    }

    // During the 300ms debounce window, value and extendsValue are out of sync.
    // Clear markers until the debounced state catches up to avoid stale diagnostics.
    try {
      const parsed = parseYaml(value);
      const liveExtends =
        parsed && typeof parsed === 'object'
          ? (parsed as Record<string, unknown>).extends
          : undefined;
      if (liveExtends !== extendsValue) {
        monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
        return;
      }
    } catch {
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
      return;
    }

    if (!isFetched) {
      return;
    }

    const location = findExtendsLocation(value);
    if (!location) {
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
      return;
    }

    if (isError || !parentTemplate) {
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, [
        {
          ...location,
          severity: 8,
          message: EXTENDS_NOT_FOUND_ERROR(extendsValue),
          source: EXTENDS_VALIDATION_OWNER,
        },
      ]);
      return;
    }

    if (parentTemplate.definition.extends) {
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, [
        {
          ...location,
          severity: 8,
          message: EXTENDS_CHAINING_ERROR,
          source: EXTENDS_VALIDATION_OWNER,
        },
      ]);
      return;
    }

    monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, []);
  }, [editor, value, extendsValue, parentTemplate, isError, isFetched]);
};

function findExtendsLocation(
  yamlContent: string
): Pick<
  monaco.editor.IMarkerData,
  'startLineNumber' | 'startColumn' | 'endLineNumber' | 'endColumn'
> | null {
  const lines = yamlContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^extends:\s*(\S.*?)\s*(?:#.*)?$/);
    if (match) {
      const rawValue = match[1];
      const valueStart = line.indexOf(rawValue, 'extends:'.length);
      if (valueStart !== -1) {
        return {
          startLineNumber: i + 1,
          startColumn: valueStart + 1,
          endLineNumber: i + 1,
          endColumn: valueStart + rawValue.length + 1,
        };
      }
    }
  }
  return null;
}
