/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';

/**
 * Represents the properties for the MLJobWizardFieldStatsFlyout component.
 */
interface MLJobWizardFieldStatsFlyoutProps {
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: (v: boolean) => void;
  toggleFlyoutVisible: () => void;
  setFieldName: (v: string | undefined) => void;
  fieldName?: string;
  setFieldValue: (v: string) => void;
  fieldValue?: string | number;
  timeRangeMs?: TimeRangeMs;
  populatedFields?: Set<string>;
}

/**
 * Context for the ML Field Stats Flyout.
 */
export const MLFieldStatsFlyoutContext = createContext<MLJobWizardFieldStatsFlyoutProps>({
  isFlyoutVisible: false,
  setIsFlyoutVisible: () => {},
  toggleFlyoutVisible: () => {},
  setFieldName: () => {},
  setFieldValue: () => {},
  timeRangeMs: undefined,
  populatedFields: undefined,
});

/**
 * Retrieves the context for the field stats flyout.
 * @returns The field stats flyout context.
 */
export function useFieldStatsFlyoutContext() {
  const fieldStatsFlyoutContext = useContext(MLFieldStatsFlyoutContext);

  if (!fieldStatsFlyoutContext) {
    throw new Error('useFieldStatsFlyoutContext must be used within a MLFieldStatsFlyoutContext');
  }

  return fieldStatsFlyoutContext;
}
