/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Mock EUI generated ids to be consistently predictable for snapshots.
jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

// Jest automatically mocks SVGs to be a plain-text string that isn't an SVG.  Canvas uses
// them in examples, so let's mock a few for tests.
jest.mock('../canvas_plugin_src/renderers/shape/shapes', () => ({
  shapes: {
    arrow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="0,40 60,40 60,20 95,50 60,80 60,60 0,60" />
    </svg>`,
    square: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect x="0" y="0" width="100" height="100" />
    </svg>`,
  },
}));

// Mock react-datepicker dep used by eui to avoid rendering the entire large component
jest.mock('@elastic/eui/packages/react-datepicker', () => {
  return {
    __esModule: true,
    default: 'ReactDatePicker',
  };
});

jest.mock('plugins/interpreter/registries', () => ({}));
