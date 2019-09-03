/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../test/context_example';

import hello from '../../test/hello.json';
import { Canvas } from '../canvas.container';
import { Page } from '../page.container';
import { RenderedElement } from '../rendered_element.container';

storiesOf('runtime', module)
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
