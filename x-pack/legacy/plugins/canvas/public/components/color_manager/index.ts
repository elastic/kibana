/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ColorManager as Component } from './color_manager';
export { Props } from './color_manager';

export const ColorManager = React.memo(Component);
