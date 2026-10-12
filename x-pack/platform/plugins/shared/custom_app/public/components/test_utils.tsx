/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import { createAppRuntime, type AppRuntime } from '../runtime/app_runtime';
import { AppRuntimeContext } from '../runtime/app_runtime_context';

export const emptyDocument = (state: unknown = {}): AppDocument =>
  appDocumentSchema.parse({ state, root: { type: 'text', id: 'unused', text: '' } });

/** Renders a node inside a runtime built from the given document's declared state. */
export const renderWithRuntime = (
  ui: ReactElement,
  document: AppDocument = emptyDocument()
): { runtime: AppRuntime } & ReturnType<typeof render> => {
  const runtime = createAppRuntime(document);
  return {
    runtime,
    ...render(<AppRuntimeContext.Provider value={runtime}>{ui}</AppRuntimeContext.Provider>),
  };
};
