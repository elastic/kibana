/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ColorDot as Component } from './color_dot';

export { Props } from './color_dot';
export const ColorDot = React.memo(Component);
