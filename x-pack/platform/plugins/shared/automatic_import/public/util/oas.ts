/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type Oas from 'oas';
import type { ComponentsObject, KeyedSecuritySchemeObject, SecurityType } from 'oas/dist/types.cjs';
import { CelAuthTypeEnum } from '../../common/api/model/cel_input_attributes.gen';
import type { CelAuthType } from '../../common';

/**
 * Returns any $ref from the specified schema object.
 */
export const getAllRefValues = (schemaObj: any): Set<string> => {
  let allRefs = new Set<string>();

  if (schemaObj === null || typeof schemaObj !== 'object') {
    return allRefs;
  }

  if (Array.isArray(schemaObj)) {
    for (const elem of schemaObj) {
      if (typeof elem === 'object') {
        const subRefs = getAllRefValues(elem);
        if (subRefs.size > 0) {
          allRefs = new Set([...allRefs, ...subRefs]);
        }
      }
    }
    return allRefs;
  }

  for (const [key, value] of Object.entries(schemaObj)) {
    if (key === '$ref' && typeof value === 'string') {
      allRefs.add(value);
    } else if (typeof value === 'object' && value !== null) {
      const subRefs = getAllRefValues(value);
      if (subRefs.size > 0) {
        allRefs = new Set([...allRefs, ...subRefs]);
      }
    }
  }

  return allRefs;
};

/**
 * Retrieves the OAS spec components down to only those utilized by the specified path.
 */
export function reduceSpecComponents(oas: Oas, path: string): ComponentsObject | undefined {
  const responses = oas?.operation(path, 'get')?.schema.responses;
  const usedSchemas = getAllRefValues(responses);

  if (oas?.api) {
    // iterate the schemas and remove those not used
    const reduced: ComponentsObject | undefined = JSON.parse(JSON.stringify(oas?.api.components));
    if (reduced) {
      for (const [componentType, items] of Object.entries(reduced)) {
        for (const component of Object.keys(items)) {
          if (!usedSchemas.has(`#/components/${componentType}/${component}`)) {
            delete reduced[componentType as keyof ComponentsObject]?.[component];
          }
        }
        if (Object.keys(items).length < 1) {
          delete reduced[componentType as keyof ComponentsObject];
        }
      }
    }
    return reduced;
  }
}

/**
 * Maps the cel authType to the corresponding auth details from the OAS schema.
 */
export function getAuthDetails(
  authType: CelAuthType,
  specAuthDetails: Record<SecurityType, KeyedSecuritySchemeObject[]> | undefined
): KeyedSecuritySchemeObject | undefined {
  const auth = authType.toLowerCase();
  if (auth === CelAuthTypeEnum.basic) {
    return specAuthDetails?.Basic[0] || undefined;
  } else if (auth === CelAuthTypeEnum.oauth2) {
    return specAuthDetails?.OAuth2[0] || undefined;
  } else if (auth === CelAuthTypeEnum.header) {
    return (
      specAuthDetails?.Header?.[0] ||
      specAuthDetails?.Bearer?.[0] ||
      specAuthDetails?.apiKey?.[0] ||
      undefined
    );
  } else if (auth === CelAuthTypeEnum.digest) {
    return specAuthDetails?.http[0] || undefined;
  } else {
    // should never get here
    throw new Error('unsupported auth method');
  }
}
