/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';

import { Context } from '../../test/context';
import { Page } from '../page';

storiesOf('explorer/Page', module)
  .addParameters({
    info: {
      header: false,
      source: false,
      TableComponent: () => null,
      styles: {
        infoBody: {
          display: 'none',
        },
        infoStory: {
          margin: 0,
        },
      },
    },
  })
  .add('no expression', () => (
    <Context>
      <Page />
    </Context>
  ))
  .add('markdown', () => (
    <Context expression='markdown content="# hello world"'>
      <Page />
    </Context>
  ));
