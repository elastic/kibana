/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const processVertexStreamMock = jest.fn();
export const processVertexResponseMock = jest.fn();

jest.doMock('./process_vertex_stream', () => {
  const actual = jest.requireActual('./process_vertex_stream');
  return {
    ...actual,
    processVertexStream: processVertexStreamMock,
    processVertexResponse: processVertexResponseMock,
  };
});
