/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-env jest */

// The preset mocks Vega with its UMD bundle in a `vm` sandbox, which has no DOM and escapes the
// code-generation guard. This package tests the runtime it ships.
jest.unmock('vega');
jest.unmock('vega-lite');

// A server has no canvas, so Vega estimates text; the preset reinstalls `jest-canvas-mock` before
// each test.
const removeCanvas = () => {
  Reflect.deleteProperty(HTMLCanvasElement.prototype, 'getContext');
};
removeCanvas();
beforeEach(removeCanvas);
