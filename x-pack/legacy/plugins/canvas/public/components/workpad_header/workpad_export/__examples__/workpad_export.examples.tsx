/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { WorkpadExport } from '../workpad_export';

storiesOf('components/Export/WorkpadExport', module)
  .add('enabled', () => (
    <WorkpadExport
      enabled={true}
      onCopy={action('onCopy')}
      onExport={action('onExport')}
      getExportUrl={(type: string) => {
        action(`getExportUrl('${type}')`);
        return type;
      }}
    />
  ))
  .add('disabled', () => (
    <WorkpadExport
      enabled={false}
      onCopy={action('onCopy')}
      onExport={action('onExport')}
      getExportUrl={(type: string) => {
        action(`getExportUrl('${type}')`);
        return type;
      }}
    />
  ));
