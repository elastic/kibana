/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../../test/context_example';

import { Footer } from '../footer.container';
import { Title } from '../title.container';
import { PageControls } from '../page_controls.container';
import { PagePreview } from '../page_preview.container';
import { Scrubber } from '../scrubber.container';

storiesOf('runtime/Footer', module)
  .add('Footer', () => (
    <ExampleContext height={172}>
      <Footer />
    </ExampleContext>
  ))
  .add('Title', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <Title />
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
