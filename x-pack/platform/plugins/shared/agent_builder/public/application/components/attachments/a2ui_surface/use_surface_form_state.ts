/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';

export type SurfaceFormValues = Record<string, string | number | boolean>;

/**
 * Module-level cache so form data survives component remounts
 * (e.g. when conversation queries refetch and the A2UI surface re-mounts).
 */
const surfaceFormCache = new Map<string, SurfaceFormValues>();

export interface SurfaceFormState {
  /** Set a value silently (TextInput / TextArea) — no re-render */
  setFieldValue: (fieldId: string, value: string | number | boolean) => void;
  /** Set a value reactively (Select / ComboBox / Switch) — triggers re-render for visible_when */
  setReactiveFieldValue: (fieldId: string, value: string | number | boolean) => void;
  /** Read a reactive field value (used for visible_when checks during render) */
  getFieldValue: (fieldId: string) => string | number | boolean | undefined;
  /** Get all form data (both reactive and passive) for the submit payload */
  getFormData: () => SurfaceFormValues;
}

export const useSurfaceFormState = (surfaceId?: string): SurfaceFormState => {
  const cached = surfaceId ? surfaceFormCache.get(surfaceId) ?? {} : {};

  const formData = useRef<SurfaceFormValues>({ ...cached });

  const [reactiveValues, setReactiveValues] = useState<SurfaceFormValues>({ ...cached });

  const persist = useCallback(
    (data: SurfaceFormValues) => {
      if (surfaceId) {
        surfaceFormCache.set(surfaceId, { ...data });
      }
    },
    [surfaceId]
  );

  const setFieldValue = useCallback(
    (fieldId: string, value: string | number | boolean) => {
      formData.current[fieldId] = value;
      persist(formData.current);
    },
    [persist]
  );

  const setReactiveFieldValue = useCallback(
    (fieldId: string, value: string | number | boolean) => {
      formData.current[fieldId] = value;
      persist(formData.current);
      setReactiveValues((prev) => ({ ...prev, [fieldId]: value }));
    },
    [persist]
  );

  const getFieldValue = useCallback(
    (fieldId: string): string | number | boolean | undefined => {
      return reactiveValues[fieldId];
    },
    [reactiveValues]
  );

  const getFormData = useCallback(() => ({ ...formData.current }), []);

  return { setFieldValue, setReactiveFieldValue, getFieldValue, getFormData };
};
