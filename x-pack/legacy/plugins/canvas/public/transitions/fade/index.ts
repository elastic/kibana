/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './fade.css';

import { TransitionStrings } from '../../../i18n';

const { fade: strings } = TransitionStrings;

export const fade = () => ({
  name: 'fade',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  enter: 'fadeIn',
  exit: 'fadeOut',
});
