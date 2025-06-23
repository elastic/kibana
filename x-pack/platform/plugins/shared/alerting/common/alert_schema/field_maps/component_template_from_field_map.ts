/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  MappingDynamicTemplate,
} from '@elastic/elasticsearch/lib/api/types';
import { type FieldMap } from '@kbn/alerts-as-data-utils';
import { mappingFromFieldMap } from './mapping_from_field_map';

export interface GetComponentTemplateFromFieldMapOpts {
  name: string;
  fieldMap: FieldMap;
  includeSettings?: boolean;
  dynamic?: 'strict' | false;
  dynamicTemplates?: Array<Record<string, MappingDynamicTemplate>>;
}
export const getComponentTemplateFromFieldMap = ({
  name,
  fieldMap,
  dynamic,
  includeSettings,
  dynamicTemplates,
}: GetComponentTemplateFromFieldMapOpts): ClusterPutComponentTemplateRequest => {
  return {
    name,
    _meta: {
      managed: true,
    },
    template: {
      settings: {
        ...(includeSettings
          ? {
              number_of_shards: 1,
              'index.mapping.total_fields.limit':
                Math.ceil(Object.keys(fieldMap).length / 1000) * 1000 + 500,
            }
          : {}),
      },

      mappings: {
        ...mappingFromFieldMap(fieldMap, dynamic ?? 'strict'),
        ...(dynamicTemplates ? { dynamic_templates: dynamicTemplates } : {}),
      },
    },
  };
};
