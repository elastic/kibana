/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { Context } from '../../context/mock';

import hello from '../../test/hello.json';
import { Canvas } from '../canvas.container';
import { Page } from '../page.container';
import { RenderedElement } from '../rendered_element.container';

storiesOf('runtime', module)
  .add('Canvas', () => (
    <Context height={448}>
      <Canvas />
    </Context>
  ))
  .add('Page', () => (
    <Context height={720}>
      <Page index={0} />
    </Context>
  ))
  .add('RenderedElement', () => (
    <Context height={720}>
      <RenderedElement element={hello.pages[0].elements[0]} index={0} />
    </Context>
  ));
