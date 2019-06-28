/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { color } from './color';
import { seriesStyle } from './series_style';
import { containerStyle } from './container_style';
import { font } from './font';

// Anything that uses the color picker has to be loaded privately because the color picker uses Redux
export const argTypeSpecs = [color, containerStyle, font, seriesStyle];
