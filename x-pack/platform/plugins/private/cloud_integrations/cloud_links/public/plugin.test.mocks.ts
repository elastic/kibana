/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const maybeAddCloudLinksMock = vi.fn();

vi.doMock('./maybe_add_cloud_links', () => {
  const mocked = {
    maybeAddCloudLinks: maybeAddCloudLinksMock,
  };
  return { ...mocked, default: mocked };
});
