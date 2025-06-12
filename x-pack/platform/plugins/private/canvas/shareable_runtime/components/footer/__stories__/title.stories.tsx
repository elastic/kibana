/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ExampleContext } from '../../../test/context_example';
import { Title, TitleComponent } from '../title';

const style = { background: '#333', padding: 10 };

export default {
  title: 'shareables/Footer/Title',
};

export const ContextualHello = {
  render: () => (
    <ExampleContext source="hello" {...{ style }}>
      <Title />
    </ExampleContext>
  ),

  name: 'contextual: hello',
};

export const ContextualAustin = {
  render: () => (
    <ExampleContext source="austin" {...{ style }}>
      <Title />
    </ExampleContext>
  ),

  name: 'contextual: austin',
};

export const Component = {
  render: () => (
    <ExampleContext {...{ style }}>
      <TitleComponent title="This is a test title." />
    </ExampleContext>
  ),

  name: 'component',
};
