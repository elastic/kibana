/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';

import { ExampleContext } from '../../../test/context_example';
import { Title, TitleComponent } from '../title';

const style = { background: '#333', padding: 10 };

storiesOf('shareables/Footer/Title', module)
  .add('contextual: hello', () => (
    <ExampleContext source="hello" {...{ style }}>
      <Title />
    </ExampleContext>
  ))
  .add('contextual: austin', () => (
    <ExampleContext source="austin" {...{ style }}>
      <Title />
    </ExampleContext>
  ))
  .add('component', () => (
    <ExampleContext {...{ style }}>
      <TitleComponent title="This is a test title." />
    </ExampleContext>
  ));
