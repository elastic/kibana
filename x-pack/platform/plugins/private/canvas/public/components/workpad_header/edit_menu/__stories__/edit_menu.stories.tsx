/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { EditMenu } from '../edit_menu.component';
import { PositionedElement } from '../../../../../types';

const handlers = {
  cutNodes: action('cutNodes'),
  copyNodes: action('copyNodes'),
  pasteNodes: action('pasteNodes'),
  deleteNodes: action('deleteNodes'),
  cloneNodes: action('cloneNodes'),
  bringToFront: action('bringToFront'),
  bringForward: action('bringForward'),
  sendBackward: action('sendBackward'),
  sendToBack: action('sendToBack'),
  alignLeft: action('alignLeft'),
  alignCenter: action('alignCenter'),
  alignRight: action('alignRight'),
  alignTop: action('alignTop'),
  alignMiddle: action('alignMiddle'),
  alignBottom: action('alignBottom'),
  distributeHorizontally: action('distributeHorizontally'),
  distributeVertically: action('distributeVertically'),
  createCustomElement: action('createCustomElement'),
  groupNodes: action('groupNodes'),
  ungroupNodes: action('ungroupNodes'),
  undoHistory: action('undoHistory'),
  redoHistory: action('redoHistory'),
};

export default {
  title: 'components/WorkpadHeader/EditMenu',
};

export const Default = {
  render: () => (
    <EditMenu selectedNodes={[]} groupIsSelected={false} hasPasteData={false} {...handlers} />
  ),

  name: 'default',
};

export const ClipboardDataExists = {
  render: () => (
    <EditMenu selectedNodes={[]} groupIsSelected={false} hasPasteData={true} {...handlers} />
  ),

  name: 'clipboard data exists',
};

export const SingleElementSelected = {
  render: () => (
    <EditMenu
      selectedNodes={[{ id: 'foo' }] as PositionedElement[]}
      groupIsSelected={false}
      hasPasteData={false}
      {...handlers}
    />
  ),

  name: 'single element selected',
};

export const SingleGroupedElementSelected = {
  render: () => (
    <EditMenu
      selectedNodes={[{ id: 'foo' }, { id: 'bar' }] as PositionedElement[]}
      groupIsSelected={true}
      hasPasteData={false}
      {...handlers}
    />
  ),

  name: 'single grouped element selected',
};

export const _2ElementsSelected = {
  render: () => (
    <EditMenu
      selectedNodes={[{ id: 'foo' }, { id: 'bar' }] as PositionedElement[]}
      groupIsSelected={false}
      hasPasteData={false}
      {...handlers}
    />
  ),

  name: '2 elements selected',
};

export const _3ElementsSelected = {
  render: () => (
    <EditMenu
      selectedNodes={[{ id: 'foo' }, { id: 'bar' }, { id: 'fizz' }] as PositionedElement[]}
      groupIsSelected={false}
      hasPasteData={false}
      {...handlers}
    />
  ),

  name: '3+ elements selected',
};
