/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ViewMenu } from '../view_menu';

const testBoundingBox = { left: 0, right: 1280, top: 0, bottom: 720 };

storiesOf('components/Export/ViewMenu', module).add('enabled', () => (
  <ViewMenu
    isWriteable={true}
    zoomScale={1}
    boundingBox={testBoundingBox}
    setZoomScale={action('setZoomScale')}
    workpadHeight={720}
    workpadWidth={1280}
    zoomIn={action('zoomIn')}
    zoomOut={action('zoomOut')}
    toggleWriteable={action('toggleWriteable')}
    resetZoom={action('resetZoom')}
    enterFullscreen={action('enterFullscreen')}
    doRefresh={action('doRefresh')}
  />
));
