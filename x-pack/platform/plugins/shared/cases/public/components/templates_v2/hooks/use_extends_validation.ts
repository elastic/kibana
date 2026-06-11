/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import { monaco } from '@kbn/monaco';
import { parseExtendsRef } from '../utils/parse_extends_ref';
import { useGetTemplate } from './use_get_template';
import {
  EXTENDS_CHAINING_ERROR,
  EXTENDS_NOT_FOUND_ERROR,
  EXTENDS_VERSION_NOT_FOUND_ERROR,
} from '../translations';

const EXTENDS_VALIDATION_OWNER = 'extends-validation';

export const useExtendsValidation = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  value: string
) => {
  // The raw `extends` string from the YAML (may include `@version` suffix).
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

  // Parse the raw ref into id + optional pinned version.
  const { templateId: extendsTemplateId, version: extendsVersion } = parseExtendsRef(extendsValue);

  const {
    data: parentTemplate,
    isError,
    isFetched,
  } = useGetTemplate(extendsTemplateId, extendsVersion, {
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
      // When a specific version was pinned, report a version-specific error so
      // the user knows the template itself exists but that version does not.
      const message =
        extendsVersion != null
          ? EXTENDS_VERSION_NOT_FOUND_ERROR(extendsValue, extendsVersion)
          : EXTENDS_NOT_FOUND_ERROR(extendsValue);
      monaco.editor.setModelMarkers(model, EXTENDS_VALIDATION_OWNER, [
        {
          ...location,
          severity: 8,
          message,
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
  }, [
    editor,
    value,
    extendsValue,
    extendsTemplateId,
    extendsVersion,
    parentTemplate,
    isError,
    isFetched,
  ]);
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
