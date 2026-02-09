/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * NOTE: this test uses a mock template definition to try and render the controls
 * as per their definitions stored in the controlRegistry
 */
const exampleCaseTemplate = `
fields:
  - name: severity
    control: select
    label: Field label
    type: keyword
    metadata:
      default: low
      options:
        - low
        - moderate
        - high
        - critical
`;

describe('controlRegistry', () => {});
