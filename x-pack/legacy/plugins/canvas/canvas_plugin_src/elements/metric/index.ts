/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import header from './header.png';
import { AdvancedSettings } from '../../../public/lib/kibana_advanced_settings';

import { ElementFactory } from '../../../types';
export const metric: ElementFactory = () => ({
  name: 'metric',
  displayName: 'Metric',
  tags: ['text'],
  help: 'A number with a label',
  width: 200,
  height: 100,
  image: header,
  expression: `filters
| demodata
| math "unique(country)"
| metric "Countries" 
  metricFont={font size=48 family="${openSans.value}" color="#000000" align="center" lHeight=48} 
  labelFont={font size=14 family="${openSans.value}" color="#000000" align="center"}
  metricFormat="${AdvancedSettings.get('format:number:defaultPattern')}"
| render`,
});
