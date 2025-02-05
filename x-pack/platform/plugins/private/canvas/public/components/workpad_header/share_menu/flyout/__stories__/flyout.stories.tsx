/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ShareWebsiteFlyout } from '../flyout.component';
import { reduxDecorator } from '../../../../../../storybook';

storiesOf('components/WorkpadHeader/ShareMenu/ShareWebsiteFlyout', module)
  .addDecorator(reduxDecorator())
  .addParameters({
    info: {
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '20px 30px',
          width: '620px',
        },
      },
    },
  })
  .add('default', () => (
    <ShareWebsiteFlyout onClose={action('onClose')} renderedWorkpad={{} as any} />
  ))
  .add('unsupported renderers', () => (
    <ShareWebsiteFlyout
      onClose={action('onClose')}
      unsupportedRenderers={['rendererOne', 'rendererTwo']}
      renderedWorkpad={{} as any}
    />
  ));
