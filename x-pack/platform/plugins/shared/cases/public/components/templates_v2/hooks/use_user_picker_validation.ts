/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { parse } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { bulkGetUserProfiles } from '../../../containers/user_profiles/api';
import { INVALID_USER_PICKER_DEFAULT } from '../translations';

const USER_PICKER_VALIDATION_OWNER = 'user-picker-validation';

interface UserDefaultInfo {
  uid: string;
  name: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export const useUserPickerValidation = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  value: string,
  security: SecurityPluginStart
) => {
  const generationRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      const generation = ++generationRef.current;

      try {
        const markers = await buildUserPickerMarkers(model, value, security);
        if (generation === generationRef.current) {
          monaco.editor.setModelMarkers(model, USER_PICKER_VALIDATION_OWNER, markers);
        }
      } catch {
        if (generation === generationRef.current) {
          monaco.editor.setModelMarkers(model, USER_PICKER_VALIDATION_OWNER, []);
        }
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editor, value, security]);
};

async function buildUserPickerMarkers(
  model: monaco.editor.ITextModel,
  yamlContent: string,
  security: SecurityPluginStart
): Promise<monaco.editor.IMarkerData[]> {
  let parsed: unknown;

  try {
    parsed = parse(yamlContent);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  const fields = (parsed as Record<string, unknown>).fields;
  if (!Array.isArray(fields)) {
    return [];
  }

  const userPickerFields = fields.filter(
    (field): field is Record<string, unknown> =>
      typeof field === 'object' &&
      field !== null &&
      (field as Record<string, unknown>).control === FieldType.USER_PICKER
  );

  if (userPickerFields.length === 0) {
    return [];
  }

  const defaultInfos = collectUserPickerDefaults(yamlContent, userPickerFields);

  if (defaultInfos.length === 0) {
    return [];
  }

  const uids = defaultInfos.map((d) => d.uid);
  const profiles = await bulkGetUserProfiles({ security, uids });
  const profileMap = new Map(profiles.map((p) => [p.uid, p]));

  const markers: monaco.editor.IMarkerData[] = [];

  for (const info of defaultInfos) {
    const profile = profileMap.get(info.uid);
    const isInvalid = !profile || getUserDisplayName(profile.user) !== info.name;

    if (isInvalid) {
      markers.push({
        startLineNumber: info.startLineNumber,
        startColumn: info.startColumn,
        endLineNumber: info.endLineNumber,
        endColumn: info.endColumn,
        severity: monaco.MarkerSeverity.Error,
        message: INVALID_USER_PICKER_DEFAULT(info.name),
        source: USER_PICKER_VALIDATION_OWNER,
      });
    }
  }

  return markers;
}

export function collectUserPickerDefaults(
  yamlContent: string,
  userPickerFields: Array<Record<string, unknown>>
): UserDefaultInfo[] {
  const lines = yamlContent.split('\n');

  return userPickerFields.flatMap((field) => {
    const { metadata } = field;
    if (!metadata || typeof metadata !== 'object') {
      return [];
    }

    const defaults = (metadata as Record<string, unknown>).default;
    if (!Array.isArray(defaults) || defaults.length === 0) {
      return [];
    }

    const fieldName = typeof field.name === 'string' ? field.name : null;
    if (!fieldName) {
      return [];
    }

    const fieldBlockStart = findFieldBlockStart(lines, fieldName);
    if (fieldBlockStart === -1) {
      return [];
    }

    return defaults.flatMap((entry) => {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as Record<string, unknown>).uid !== 'string' ||
        typeof (entry as Record<string, unknown>).name !== 'string'
      ) {
        return [];
      }

      const { uid, name: displayName } = entry as { uid: string; name: string };
      const location = findDefaultEntryLocation(lines, fieldBlockStart, uid, displayName);

      return location ? [{ uid, name: displayName, ...location }] : [];
    });
  });
}

function findFieldBlockStart(lines: string[], fieldName: string): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\s*-?\s*name:\s*/)) {
      const nameMatch = line.match(/name:\s*(['"]?)(.+?)\1\s*$/);
      if (nameMatch && nameMatch[2].trim() === fieldName) {
        return i;
      }
    }
  }
  return -1;
}

function findDefaultEntryLocation(
  lines: string[],
  fieldBlockStart: number,
  uid: string,
  displayName: string
): Pick<UserDefaultInfo, 'startLineNumber' | 'startColumn' | 'endLineNumber' | 'endColumn'> | null {
  // Look for `- uid: <uid>` or `  name: <displayName>` within the field's default block
  // after the field block start. We highlight the `name` value as it is what the user sees.
  for (let i = fieldBlockStart + 1; i < lines.length; i++) {
    const line = lines[i];

    // Stop when we hit the next top-level field entry (a new `- name:` at the same indent level)
    if (i > fieldBlockStart + 1 && line.match(/^\s{0,4}-\s+name:/)) {
      break;
    }

    const uidMatch = line.match(/uid:\s*['"]?(.+?)['"]?\s*$/);
    if (uidMatch && uidMatch[1].trim() === uid) {
      // Found the uid entry — now look for its sibling `name:` line
      const siblingStart = Math.max(0, i - 2);
      const siblingEnd = Math.min(lines.length - 1, i + 2);
      for (let j = siblingStart; j <= siblingEnd; j++) {
        const sibling = lines[j];
        const nameMatch = sibling.match(/name:\s*['"]?(.+?)['"]?\s*$/);
        if (nameMatch && nameMatch[1].trim() === displayName) {
          const colonIndex = sibling.indexOf('name:');
          const valueStart = sibling.indexOf(displayName, colonIndex);
          if (valueStart !== -1) {
            return {
              startLineNumber: j + 1,
              startColumn: valueStart + 1,
              endLineNumber: j + 1,
              endColumn: valueStart + displayName.length + 1,
            };
          }
        }
      }

      // Fall back: highlight the uid value itself
      const colonIndex = line.indexOf('uid:');
      const valueStart = line.indexOf(uid, colonIndex);
      if (valueStart !== -1) {
        return {
          startLineNumber: i + 1,
          startColumn: valueStart + 1,
          endLineNumber: i + 1,
          endColumn: valueStart + uid.length + 1,
        };
      }
    }
  }

  return null;
}
