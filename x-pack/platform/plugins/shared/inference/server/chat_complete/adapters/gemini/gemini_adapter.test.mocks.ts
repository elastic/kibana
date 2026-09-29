/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const processVertexStreamMock = vi.fn();
export const processVertexResponseMock = vi.fn();

vi.doMock('./process_vertex_stream', async () => {
  const actual = (await vi.importActual('./process_vertex_stream'));
  return {
    ...actual,
    processVertexStream: processVertexStreamMock,
    processVertexResponse: processVertexResponseMock,
  };
});
