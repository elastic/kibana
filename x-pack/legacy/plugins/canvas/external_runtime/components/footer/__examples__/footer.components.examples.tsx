/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { Title } from '../title';
import { PageControls } from '../page_controls';

storiesOf('runtime/Footer/components', module)
  .add('Title', () => (
    <div style={{ background: '#333', padding: 10 }}>
      <Title title="This is a test title." />
    </div>
  ))
  .add('PageControls', () => (
    <PageControls
      page={0}
      totalPages={1}
      onSetPageNumber={action('onSetPageNumber')}
      onToggleScrubber={action('onToggleScrubber')}
    />
  ));
