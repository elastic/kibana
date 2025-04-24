/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { ExampleContext } from '../../../test/context_example';
import { PageControls, PageControlsComponent } from '../page_controls';

const style = { background: '#333', padding: 10 };

export default {
  title: 'shareables/Footer/PageControls',
};

export const ContextualHello = {
  render: () => (
    <ExampleContext source="austin" {...{ style }}>
      <PageControls />
    </ExampleContext>
  ),

  name: 'contextual: hello',
};

export const ContextualAustin = {
  render: () => (
    <ExampleContext source="austin" {...{ style }}>
      <PageControls />
    </ExampleContext>
  ),

  name: 'contextual: austin',
};

export const Component = {
  render: () => (
    <div {...{ style }}>
      <PageControlsComponent
        page={0}
        totalPages={10}
        onSetPageNumber={action('onSetPageNumber')}
        onToggleScrubber={action('onToggleScrubber')}
      />
    </div>
  ),

  name: 'component',
};
