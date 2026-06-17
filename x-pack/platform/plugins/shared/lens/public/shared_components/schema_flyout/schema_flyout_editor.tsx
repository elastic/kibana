/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonRectangle } from '@elastic/eui';
import type { FieldDescriptor } from '../../../common/schema_types';
import { useSchemaDescriptions } from './use_schema_descriptions';
import { SchemaFormField } from './fields';
import { getStateAdapter } from './state_adapters';
import { filterFieldsByCondition } from './evaluate_condition';

interface SchemaFlyoutEditorProps {
  visualizationId: string;
  state: unknown;
  setState: (newState: unknown) => void;
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
const collectLeafPaths = (fields: FieldDescriptor[]): string[] => {
  const paths: string[] = [];
  const walk = (descriptors: FieldDescriptor[]) => {
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
  fields: FieldDescriptor[]
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

/** Inner form component — only mounted when field descriptors are available */
const SchemaForm: React.FC<{
  fieldDescriptors: FieldDescriptor[];
  state: unknown;
  setState: (newState: unknown) => void;
  visualizationId: string;
}> = ({ fieldDescriptors, state, setState, visualizationId }) => {
  const adapter = useMemo(() => getStateAdapter(visualizationId), [visualizationId]);

  const defaultValues = useMemo(
    () =>
      adapter
        ? adapter.stateToFormValues(state)
        : extractSettingsFromState(state, fieldDescriptors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fieldDescriptors, adapter]
  );

  const methods = useForm({ defaultValues: defaultValues as Record<string, {}> });

  const stateRef = useRef(state);
  stateRef.current = state;

  const setStateRef = useRef(setState);
  setStateRef.current = setState;

  const lastEmittedRef = useRef<string>(JSON.stringify(defaultValues));

  useEffect(() => {
    const subscription = methods.watch((values) => {
      const serialized = JSON.stringify(values);
      if (serialized !== lastEmittedRef.current) {
        lastEmittedRef.current = serialized;
        const formValues = values as Record<string, unknown>;
        const newState = adapter
          ? adapter.formValuesToState(stateRef.current, formValues)
          : mergeSettingsIntoState(stateRef.current, formValues);
        setStateRef.current(newState);
      }
    });
    return () => subscription.unsubscribe();
  }, [methods, adapter]);

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

export const SchemaFlyoutEditor: React.FC<SchemaFlyoutEditorProps> = ({
  visualizationId,
  state,
  setState,
}) => {
  const { data: fieldDescriptors, isLoading } = useSchemaDescriptions(visualizationId);

  const visibleFields = useMemo(
    () => filterFieldsByCondition(fieldDescriptors, state),
    [fieldDescriptors, state]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiSkeletonRectangle width="100%" height={32} borderRadius="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSkeletonRectangle width="100%" height={32} borderRadius="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSkeletonRectangle width="100%" height={32} borderRadius="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <SchemaForm
      fieldDescriptors={visibleFields}
      state={state}
      setState={setState}
      visualizationId={visualizationId}
    />
  );
};
