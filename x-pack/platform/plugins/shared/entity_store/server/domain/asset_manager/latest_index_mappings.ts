/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { getEntityDefinitionComponentTemplate } from './component_templates';

type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

/** Returns the merged mapping properties of every entity type's latest component template. */
export const getLatestIndexMappingProperties = (namespace: string): MappingProperties =>
  Object.assign(
    {},
    ...ALL_ENTITY_TYPES.map(
      (type) =>
        getEntityDefinitionComponentTemplate(getEntityDefinition(type, namespace), namespace)
          .template.mappings.properties
    )
  );
