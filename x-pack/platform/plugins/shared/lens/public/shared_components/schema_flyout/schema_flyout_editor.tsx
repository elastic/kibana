/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { walkSchemaDescription } from './schema_walker';
import type { FormFieldDescriptor } from './schema_walker';
import { SchemaFormField } from './fields';

interface SchemaFlyoutEditorProps {
  visualizationId: string;
  state: unknown;
  setState: (newState: unknown) => void;
}

interface VizSchemaData {
  description: Record<string, unknown>;
  excludeSections: string[];
}

/** Get a nested value by dot-delimited path */
export const getByPath = (obj: unknown, path: string): unknown => {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

/** Set a nested value by dot-delimited path, returning a new object (immutable) */
export const setByPath = (obj: unknown, path: string, value: unknown): unknown => {
  const parts = path.split('.');
  if (parts.length === 0) return obj;

  const root =
    typeof obj === 'object' && obj !== null ? { ...(obj as Record<string, unknown>) } : {};

  if (parts.length === 1) {
    root[parts[0]] = value;
    return root;
  }

  let current = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const existing = current[part];
    const clone =
      typeof existing === 'object' && existing !== null
        ? { ...(existing as Record<string, unknown>) }
        : {};
    current[part] = clone;
    current = clone;
  }
  current[parts[parts.length - 1]] = value;
  return root;
};

/** Collect leaf paths from field descriptors */
const collectLeafPaths = (fields: FormFieldDescriptor[]): string[] => {
  const paths: string[] = [];
  const walk = (descriptors: FormFieldDescriptor[]) => {
    for (const f of descriptors) {
      if (f.children && f.children.length > 0) {
        walk(f.children);
      } else {
        paths.push(f.path);
      }
    }
  };
  walk(fields);
  return paths;
};

export const extractSettingsFromState = (
  state: unknown,
  fields: FormFieldDescriptor[]
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const leafPaths = collectLeafPaths(fields);
  for (const path of leafPaths) {
    const value = getByPath(state, path);
    if (value !== undefined) {
      result[path] = value;
    }
  }
  return result;
};

export const mergeSettingsIntoState = (
  state: unknown,
  formValues: Record<string, unknown>
): unknown => {
  let result = state;
  for (const [path, value] of Object.entries(formValues)) {
    result = setByPath(result, path, value);
  }
  return result;
};

export const SchemaFlyoutEditor: React.FC<SchemaFlyoutEditorProps> = ({
  visualizationId,
  state,
  setState,
}) => {
  const { services } = useKibana();
  const [schemaDescriptions, setSchemaDescriptions] = useState<Record<
    string,
    VizSchemaData
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    services.http
      ?.get<Record<string, VizSchemaData>>('/internal/lens/schema_descriptions')
      .then((data) => {
        if (!cancelled) setSchemaDescriptions(data);
      })
      .catch(() => {}); // silently fail — falls back to no flyout
    return () => {
      cancelled = true;
    };
  }, [services.http]);

  const vizData = schemaDescriptions?.[visualizationId];

  const fieldDescriptors = useMemo(() => {
    if (!vizData) return [];
    return walkSchemaDescription(vizData.description, {
      excludePaths: vizData.excludeSections,
    });
  }, [vizData]);

  const defaultValues = useMemo(
    () => extractSettingsFromState(state, fieldDescriptors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fieldDescriptors]
  );

  const methods = useForm({ defaultValues: defaultValues as Record<string, {}> });

  const stateRef = useRef(state);
  stateRef.current = state;

  const setStateRef = useRef(setState);
  setStateRef.current = setState;

  useEffect(() => {
    const subscription = methods.watch((values) => {
      const newState = mergeSettingsIntoState(stateRef.current, values as Record<string, unknown>);
      setStateRef.current(newState);
    });
    return () => subscription.unsubscribe();
  }, [methods]);

  if (!vizData || fieldDescriptors.length === 0) {
    return null;
  }

  return (
    <FormProvider {...methods}>
      <EuiFlexGroup direction="column" gutterSize="m">
        {fieldDescriptors.map((descriptor) => (
          <EuiFlexItem key={descriptor.path} grow={false}>
            <SchemaFormField descriptor={descriptor} control={methods.control} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </FormProvider>
  );
};
