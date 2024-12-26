/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { reduxDecorator } from '../../../../../storybook';
import { ShareMenu } from '../share_menu.component';

export default {
  title: 'components/WorkpadHeader/ShareMenu',
  decorators: [reduxDecorator()],
};

export const Minimal = {
  render: () => <ShareMenu onExport={action('onExport')} ReportingComponent={null} />,
  name: 'minimal',
};

export const WithReporting = {
  render: () => (
    <ShareMenu
      onExport={action('onExport')}
      ReportingComponent={() => <div>Provided Reporting Component</div>}
    />
  ),

  name: 'with Reporting',
};
