/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { Context } from '../../../context/mock';

import { Footer } from '../footer.container';
import { Title } from '../title.container';
import { PageControls } from '../page_controls.container';
import { PagePreview } from '../page_preview.container';
import { Scrubber } from '../scrubber.container';

storiesOf('runtime/Footer', module)
  .add('Footer', () => (
    <Context height={172}>
      <Footer />
    </Context>
  ))
  .add('Title', () => (
    <Context style={{ background: '#333', padding: 10 }}>
      <Title />
    </Context>
  ))
  .add('Scrubber', () => (
    <Context height={172} isScrubberVisible={true}>
      <Scrubber />
    </Context>
  ))
  .add('PageControls', () => (
    <Context style={{ background: '#333', padding: 10 }}>
      <PageControls />
    </Context>
  ))
  .add('PagePreview', () => (
    <Context>
      <PagePreview height={172} index={0} />
    </Context>
  ));
