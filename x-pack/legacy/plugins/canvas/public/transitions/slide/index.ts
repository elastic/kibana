/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './slide.css';

import { TransitionStrings } from '../../../i18n';

const { slide: strings } = TransitionStrings;

export const slide = () => ({
  name: 'slide',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  enter: 'slideIn',
  exit: 'slideOut',
});
