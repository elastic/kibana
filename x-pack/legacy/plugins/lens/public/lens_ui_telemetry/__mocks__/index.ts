/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';

export const LensTelemetryContext = createContext<{
  trackClick: (name: string) => void;
  trackSuggestionClick: (name: string, suggestionData: unknown) => void;
}>({
  trackClick: jest.fn(),
  trackSuggestionClick: jest.fn(),
});

export const useLensTelemetry = () => useContext(LensTelemetryContext);
