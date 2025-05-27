/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { EditorMenu } from '../editor_menu.component';

const testVisTypes: BaseVisType[] = [
  { title: 'TSVB', icon: '', description: 'Description of TSVB', name: 'tsvb' } as BaseVisType,
  {
    titleInWizard: 'Custom visualization',
    title: 'Vega',
    icon: '',
    description: 'Description of Vega',
    name: 'vega',
  } as BaseVisType,
];

const testVisTypeAliases: VisTypeAlias[] = [
  {
    title: 'Lens',
    alias: {
      app: 'lens',
      path: 'path/to/lens',
    },
    icon: 'lensApp',
    name: 'lens',
    description: 'Description of Lens app',
    stage: 'production',
  },
  {
    title: 'Maps',
    alias: {
      app: 'maps',
      path: 'path/to/maps',
    },
    icon: 'gisApp',
    name: 'maps',
    description: 'Description of Maps app',
    stage: 'production',
  },
];

export default {
  title: 'components/WorkpadHeader/EditorMenu',
};

export const Default = {
  render: () => (
    <EditorMenu
      addPanelActions={[]}
      promotedVisTypes={testVisTypes}
      visTypeAliases={testVisTypeAliases}
      createNewVisType={() => action('createNewVisType')}
      createNewEmbeddableFromAction={() => action('createNewEmbeddableFromAction')}
    />
  ),

  name: 'default',
};
