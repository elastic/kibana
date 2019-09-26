/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { PDFPanel } from '../pdf_panel';

storiesOf('components/Export/PDFPanel', module)
  .addParameters({
    info: {
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '20px 30px',
          width: '290px',
        },
      },
    },
  })
  .add('default', () => (
    <div className="euiPanel">
      <PDFPanel pdfURL="pdfUrl" onCopy={action('onCopy')} onExport={action('onExport')} />
    </div>
  ));
