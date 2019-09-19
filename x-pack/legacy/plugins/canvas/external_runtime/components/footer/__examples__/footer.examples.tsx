/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { TestingContext } from '../../../test';

import { Footer } from '../footer.container';
import { Title } from '../title.container';
import { PageControls } from '../page_controls.container';
import { PagePreview } from '../page_preview.container';
import { Scrubber } from '../scrubber.container';

storiesOf('runtime/Footer', module)
  .add('Footer', () => (
    <TestingContext height={172}>
      <Footer />
    </TestingContext>
  ))
  .add('Title', () => (
    <TestingContext style={{ background: '#333', padding: 10 }}>
      <Title />
    </TestingContext>
  ))
  .add('Scrubber', () => (
    <TestingContext height={172} isScrubberVisible={true}>
      <Scrubber />
    </TestingContext>
  ))
  .add('PageControls', () => (
    <TestingContext style={{ background: '#333', padding: 10 }}>
      <PageControls />
    </TestingContext>
  ))
  .add('PagePreview', () => (
    <TestingContext>
      <PagePreview height={172} index={0} />
    </TestingContext>
  ));
