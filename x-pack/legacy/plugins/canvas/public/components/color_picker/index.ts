/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pure } from 'recompose';

import { ColorPicker as Component } from './color_picker';

export { Props } from './color_picker';
export const ColorPicker = pure(Component);
