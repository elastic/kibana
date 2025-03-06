/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openSans } from '../../../common/lib/fonts';
import { ElementFactory } from '../../../types';

export const horizontalProgressPill: ElementFactory = () => ({
  name: 'horizontalProgressPill',
  displayName: 'Horizontal pill',
  type: 'progress',
  help: 'Displays progress as a portion of a horizontal pill',
  width: 400,
  height: 30,
  expression: `kibana
| selectFilter
| demodata
| math "mean(percent_uptime)"
| progress shape="horizontalPill" label={formatnumber 0%} font={font size=24 family="${openSans.value}" color="#000000" align=center}
| render`,
});
