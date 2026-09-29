/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

vi.mock('../../../app/services/track_ui_metric', async () => {
  const original = await vi.importActual('../../../app/services/track_ui_metric');

  return {
    ...original,
    trackUiMetric: vi.fn(),
    trackUserRequest: <T>(request: Promise<T>): Promise<T> => request,
  };
});
