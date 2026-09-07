/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom-v5-compat';
import { InkRouteContextProvider } from './route_context';

interface InkRouterProps {
  children: React.ReactNode;
  initialPath?: string;
}

/**
 * Ink-compatible React Router. Uses a MemoryRouter and sets an additional
 * context provider.
 */
export function InkRouter({ children, initialPath = '/' }: InkRouterProps) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <InkRouteContextProvider>{children}</InkRouteContextProvider>
    </MemoryRouter>
  );
}
