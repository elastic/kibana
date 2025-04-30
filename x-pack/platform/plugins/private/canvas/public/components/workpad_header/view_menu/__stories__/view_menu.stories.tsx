/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { ViewMenu } from '../view_menu.component';

const handlers = {
  setZoomScale: action('setZoomScale'),
  zoomIn: action('zoomIn'),
  zoomOut: action('zoomOut'),
  toggleWriteable: action('toggleWriteable'),
  resetZoom: action('resetZoom'),
  enterFullscreen: action('enterFullscreen'),
  doRefresh: action('doRefresh'),
  fitToWindow: action('fitToWindow'),
  setRefreshInterval: action('setRefreshInterval'),
  setAutoplayInterval: action('setAutoplayInterval'),
  enableAutoplay: action('enableAutoplay'),
};

export default {
  title: 'components/WorkpadHeader/ViewMenu',
};

export const EditMode = {
  render: () => (
    <ViewMenu
      isWriteable={true}
      zoomScale={1}
      refreshInterval={0}
      autoplayInterval={0}
      autoplayEnabled={false}
      {...handlers}
    />
  ),

  name: 'edit mode',
};

export const ReadOnlyMode = {
  render: () => (
    <ViewMenu
      isWriteable={false}
      zoomScale={1}
      refreshInterval={0}
      autoplayInterval={0}
      autoplayEnabled={false}
      {...handlers}
    />
  ),

  name: 'read only mode',
};

export const WithRefreshEnabled = {
  render: () => (
    <ViewMenu
      isWriteable={false}
      zoomScale={1}
      refreshInterval={1000}
      autoplayInterval={0}
      autoplayEnabled={false}
      {...handlers}
    />
  ),

  name: 'with refresh enabled',
};

export const WithAutoplayEnabled = {
  render: () => (
    <ViewMenu
      isWriteable={false}
      zoomScale={1}
      refreshInterval={0}
      autoplayInterval={5000}
      autoplayEnabled={true}
      {...handlers}
    />
  ),

  name: 'with autoplay enabled',
};
