/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../test/context_example';

import { sharedWorkpads } from '../../test';
import { Canvas } from '../canvas';
import { Page } from '../page';
import { RenderedElement } from '../rendered_element';

const { hello } = sharedWorkpads;

storiesOf('shareables', module)
  .add('Canvas', () => (
    <ExampleContext height={448}>
      <Canvas />
    </ExampleContext>
  ))
  .add('Page', () => (
    <ExampleContext height={720}>
      <Page index={0} />
    </ExampleContext>
  ))
  .add('RenderedElement', () => (
    <ExampleContext height={720}>
      <RenderedElement element={hello.pages[0].elements[0]} index={0} />
    </ExampleContext>
  ));
