/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './rotate.scss';

import { TransitionStrings } from '../../../i18n';

const { rotate: strings } = TransitionStrings;

export const rotate = () => ({
  name: 'rotate',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  enter: 'rotateIn',
  exit: 'rotateOut',
});
