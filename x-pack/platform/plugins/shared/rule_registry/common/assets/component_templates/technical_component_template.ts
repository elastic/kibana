/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { ClusterPutComponentTemplateBody } from '../../types';
import { technicalRuleFieldMap } from '../field_maps/technical_rule_field_map';

export const technicalComponentTemplate: ClusterPutComponentTemplateBody = {
  template: {
    settings: {
      number_of_shards: 1,
    },
    mappings: mappingFromFieldMap(technicalRuleFieldMap, 'strict'),
  },
};
