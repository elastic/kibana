/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { KeyboardShortcutsDoc } from '../keyboard_shortcuts_doc';

export default {
  title: 'components/KeyboardShortcutsDoc',
};

export const Default = {
  render: () => <KeyboardShortcutsDoc onClose={action('onClose')} />,
  name: 'default',
};
