/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { action } from '@storybook/addon-actions';
import { KeyboardShortcutsDoc } from '../keyboard_shortcuts_doc';

storiesOf('components/KeyboardShortcutsDoc', module).add('default', () => (
  <KeyboardShortcutsDoc onClose={action('onClose')} />
));
