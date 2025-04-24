/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExampleContext } from '../../test/context_example';

import { Page, PageComponent } from '../page';
import { sharedWorkpads } from '../../test';
const { austin } = sharedWorkpads;

export default {
  title: 'shareables/Page',
};

export const ContextualAustin = {
  render: () => (
    <ExampleContext source="austin" style={{ height: 720 }}>
      <Page index={3} />
    </ExampleContext>
  ),

  name: 'contextual: austin',
};

export const ContextualHello = {
  render: () => (
    <ExampleContext source="hello" style={{ height: 720 }}>
      <Page index={0} />
    </ExampleContext>
  ),

  name: 'contextual: hello',
};

export const Component = {
  render: () => (
    <ExampleContext source="austin" style={{ height: 720 }}>
      <PageComponent height={720} width={1280} page={austin.pages[3]} />
    </ExampleContext>
  ),

  name: 'component',
};
