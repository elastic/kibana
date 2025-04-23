/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CanvasRenderedPage } from '../../../types';
import { ExampleContext } from '../../../test/context_example';
import { Scrubber, ScrubberComponent } from '../scrubber';
import { workpads } from '../../../../__fixtures__/workpads';

export default {
  title: 'shareables/Footer/Scrubber',
};

export const ContextualHello = {
  render: () => (
    <ExampleContext source="hello" style={{ height: 172 }} isScrubberVisible={true}>
      <Scrubber />
    </ExampleContext>
  ),

  name: 'contextual: hello',
};

export const ContextualAustin = {
  render: () => (
    <ExampleContext source="austin" style={{ height: 172 }} isScrubberVisible={true}>
      <Scrubber />
    </ExampleContext>
  ),

  name: 'contextual: austin',
};

export const Component = {
  render: () => (
    <ExampleContext style={{ height: 172 }}>
      <ScrubberComponent
        isScrubberVisible={true}
        pages={workpads[0].pages as unknown as CanvasRenderedPage[]}
      />
    </ExampleContext>
  ),

  name: 'component',
};
