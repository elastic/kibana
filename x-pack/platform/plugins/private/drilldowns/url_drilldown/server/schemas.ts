/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_ENCODE_URL, DEFAULT_OPEN_IN_NEW_TAB } from '../common/constants';

export const urlDrilldownSchema = schema.object({
  encode_url: schema.boolean({
    defaultValue: DEFAULT_ENCODE_URL,
    meta: {
      description: 'When true, URL is escaped using percent encoding',
    },
  }),
  open_in_new_tab: schema.boolean({
    defaultValue: DEFAULT_OPEN_IN_NEW_TAB,
  }),
  url: schema.string({
    meta: {
      description:
        'Templated Url. Variables documented at https://www.elastic.co/docs/explore-analyze/dashboards/drilldowns#url-template-variable',
    },
  }),
});
