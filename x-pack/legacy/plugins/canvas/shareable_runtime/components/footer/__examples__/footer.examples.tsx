/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExampleContext } from '../../../test/context_example';

import { FooterContainer } from '../footer.container';
import { TitleContainer } from '../title.container';
import { PageControlsContainer } from '../page_controls.container';
import { PagePreviewContainer } from '../page_preview.container';
import { ScrubberContainer } from '../scrubber.container';

storiesOf('shareables/Footer', module)
  .add('Footer', () => (
    <ExampleContext height={172}>
      <FooterContainer />
    </ExampleContext>
  ))
  .add('Title', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <TitleContainer />
    </ExampleContext>
  ))
  .add('Scrubber', () => (
    <ExampleContext height={172} isScrubberVisible={true}>
      <ScrubberContainer />
    </ExampleContext>
  ))
  .add('PageControls', () => (
    <ExampleContext style={{ background: '#333', padding: 10 }}>
      <PageControlsContainer />
    </ExampleContext>
  ))
  .add('PagePreview', () => (
    <ExampleContext>
      <PagePreviewContainer height={172} index={0} />
    </ExampleContext>
  ));
