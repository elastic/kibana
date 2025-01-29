/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElementFactory } from '../../../types';

export const tagCloud: ElementFactory = () => ({
  name: 'tagCloud',
  displayName: 'Tag Cloud',
  type: 'chart',
  help: 'Tagcloud visualization',
  icon: 'visTagCloud',
  expression: `kibana
| selectFilter
| demodata
| ply by="country" fn={math "count(country)" | as "Count"}
| filterrows fn={getCell "Count" | gte 10}
| tagcloud metric={visdimension "Count"} bucket={visdimension "country"}
| render`,
});
