/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '@kbn/entities-schema';

export const generateRuntimeMappings = ({
  identityFields,
  calculatedIdentity,
}: EntityDefinition): MappingRuntimeFields | undefined => {
  if (!calculatedIdentity) {
    return undefined;
  }

  if (identityFields.length !== 1) {
    throw new Error(
      `Invalid definition of cascading ids. To enable cascading fields you must have exactly one identityField defined`
    );
  }

  const id = identityFields[0];

  return {
    [id.field]: {
      type: 'keyword',
      script: {
        source: calculatedIdentity?.script,
      },
    },
  };
};
