/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ViewMenu } from '../view_menu';

storiesOf('components/Export/ViewMenu', module).add('enabled', () => (
  <ViewMenu
    onCopy={action('onCopy')}
    onExport={action('onExport')}
    getExportUrl={(type: string) => {
      action(`getExportUrl('${type}')`);
      return type;
    }}
  />
));
