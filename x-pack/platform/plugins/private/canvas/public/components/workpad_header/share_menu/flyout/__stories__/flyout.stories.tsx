/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { ShareWebsiteFlyout } from '../flyout.component';
import { reduxDecorator } from '../../../../../../storybook';

export default {
  title: 'components/WorkpadHeader/ShareMenu/ShareWebsiteFlyout',
  decorators: [reduxDecorator()],

  parameters: {
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
  },
};

export const Default = {
  render: () => <ShareWebsiteFlyout onClose={action('onClose')} renderedWorkpad={{} as any} />,

  name: 'default',
};

export const UnsupportedRenderers = {
  render: () => (
    <ShareWebsiteFlyout
      onClose={action('onClose')}
      unsupportedRenderers={['rendererOne', 'rendererTwo']}
      renderedWorkpad={{} as any}
    />
  ),

  name: 'unsupported renderers',
};
