/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { PatternColourPalette } from '@kbn/grok-ui';
import { DissectColorManager } from './dissect_color_manager';
import { DissectSample } from './dissect_sample';

interface DissectColorContextValue {
  pattern: string;
  fieldColourMap: Map<string, PatternColourPalette>;
}

const DissectColorContext = createContext<DissectColorContextValue | undefined>(undefined);

interface DissectColorProviderProps {
  pattern: string;
  children: React.ReactNode;
}

/**
 * Provides a stable DissectColorManager instance and the current field-to-color mapping
 * to descendant components. The manager deterministically assigns colors based on
 * field order in the pattern.
 *
 * Place this provider above any DissectSampleWithContext components.
 *
 * Usage:
 * ```tsx
 * <DissectColorProvider pattern="%{clientip} %{method} %{status}">
 *   <DissectSampleWithContext sample="192.168.1.1 GET 200" />
 * </DissectColorProvider>
 * ```
 */
export const DissectColorProvider = ({ pattern, children }: DissectColorProviderProps) => {
  const colorManager = useMemo(() => new DissectColorManager(), []);
  colorManager.updatePattern(pattern);
  const fieldColourMap = colorManager.getFieldColourMap();

  const value = useMemo(() => ({ pattern, fieldColourMap }), [pattern, fieldColourMap]);

  return <DissectColorContext.Provider value={value}>{children}</DissectColorContext.Provider>;
};

/**
 * Hook to access the current dissect pattern and field color mapping.
 * Must be used within a DissectColorProvider.
 */
export const useDissectColor = (): DissectColorContextValue => {
  const context = useContext(DissectColorContext);
  if (context === undefined) {
    throw new Error('useDissectColor must be used within a DissectColorProvider');
  }
  return context;
};

interface DissectSampleWithContextProps {
  sample: string;
}

/**
 * Wrapper component that reads the dissect pattern and color mapping from context,
 * then renders a DissectSample with those values.
 *
 * Must be used within a DissectColorProvider.
 */
export const DissectSampleWithContext = ({ sample }: DissectSampleWithContextProps) => {
  const { pattern, fieldColourMap } = useDissectColor();
  return <DissectSample sample={sample} pattern={pattern} fieldColourMap={fieldColourMap} />;
};
