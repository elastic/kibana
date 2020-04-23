/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { ElementFactory } from '../../../types';

export const horizontalProgressBar: ElementFactory = () => ({
  name: 'horizontalProgressBar',
  displayName: 'Horizontal bar',
  type: 'progress',
  help: 'Displays progress as a portion of a horizontal bar',
  width: 400,
  height: 30,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| progress shape="horizontalBar" label={formatnumber 0%} font={font size=24 family="${openSans.value}" color="#000000" align=center}
| render`,
});
