/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { EnabledFeaturesContextProvider, useEnabledFeatures } from './enabled_features_context';

const createWrapper = (isServerless: boolean) => {
  return ({ children }: PropsWithChildren) => (
    <EnabledFeaturesContextProvider
      isServerless={isServerless}
      isCPSEnabled={false}
      mlFeatures={{ ad: true, dfa: true, nlp: true }}
    >
      {children}
    </EnabledFeaturesContextProvider>
  );
};

describe('EnabledFeaturesContextProvider', () => {
  it.each([true, false])('exposes isServerless=%s', (isServerless) => {
    const { result } = renderHook(useEnabledFeatures, { wrapper: createWrapper(isServerless) });

    expect(result.current.isServerless).toBe(isServerless);
  });
});
