/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExampleContext } from '../../../test/context_example';

import { Footer } from '../footer';

export default {
  title: 'shareables/Footer',
};

export const ContextualHello = {
  render: () => (
    <ExampleContext height={172} source="hello">
      <Footer />
    </ExampleContext>
  ),

  name: 'contextual: hello',
};

export const ContextualAustin = {
  render: () => (
    <ExampleContext height={172} source="austin">
      <Footer />
    </ExampleContext>
  ),

  name: 'contextual: austin',
};
