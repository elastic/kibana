/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../../test/context_example';

import { Footer } from '../footer';
import { TitleContainer } from '../title.container';
import { PageControls } from '../page_controls';
import { PagePreview } from '../page_preview';
import { Scrubber } from '../scrubber';

storiesOf('shareables/Footer', module)
  .add('Footer', () => (
    <ExampleContext height={172}>
      <Footer />
    </ExampleContext>
  ))
  .add('Title', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <TitleContainer />
    </ExampleContext>
  ))
  .add('Scrubber', () => (
    <ExampleContext height={172} isScrubberVisible={true}>
      <Scrubber />
    </ExampleContext>
  ))
  .add('PageControls', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <PageControls />
    </ExampleContext>
  ))
  .add('PagePreview', () => (
    <ExampleContext>
      <PagePreview height={172} index={0} />
    </ExampleContext>
  ));
