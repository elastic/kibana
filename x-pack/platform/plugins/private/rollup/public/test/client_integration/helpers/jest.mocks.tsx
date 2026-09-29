/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

vi.mock('lodash', () => {
  const mocked = {
    ...require('lodash'),
    debounce: (fn: () => unknown) => fn,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../crud_app/services/documentation_links', async () => {
  const coreMocks = await vi.importActual('@kbn/core/public/mocks');

  return {
    init: vi.fn(),
    documentationLinks: coreMocks.docLinksServiceMock.createStartContract().links,
  };
});
