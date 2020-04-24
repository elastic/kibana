/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SidebarHeader } from '../sidebar_header';

const handlers = {
  cloneNodes: action('cloneNodes'),
  copyNodes: action('copyNodes'),
  cutNodes: action('cutNodes'),
  pasteNodes: action('pasteNodes'),
  deleteNodes: action('deleteNodes'),
  bringToFront: action('bringToFront'),
  bringForward: action('bringForward'),
  sendBackward: action('sendBackward'),
  sendToBack: action('sendToBack'),
  createCustomElement: action('createCustomElement'),
  groupNodes: action('groupNodes'),
  ungroupNodes: action('ungroupNodes'),
  alignLeft: action('alignLeft'),
  alignMiddle: action('alignMiddle'),
  alignRight: action('alignRight'),
  alignTop: action('alignTop'),
  alignCenter: action('alignCenter'),
  alignBottom: action('alignBottom'),
  distributeHorizontally: action('distributeHorizontally'),
  distributeVertically: action('distributeVertically'),
};

storiesOf('components/Sidebar/SidebarHeader', module)
  .addDecorator(story => <div style={{ width: '300px' }}>{story()}</div>)
  .add('default', () => <SidebarHeader title="Selected layer" {...handlers} />)
  .add('with layer controls', () => (
    <SidebarHeader title="Grouped element" showLayerControls={true} {...handlers} />
  ));
