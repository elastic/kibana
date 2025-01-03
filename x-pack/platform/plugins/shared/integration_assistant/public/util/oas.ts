/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type Oas from 'oas';
import type {
  ComponentsObject,
  KeyedSecuritySchemeObject,
  MediaTypeObject,
  OASDocument,
  SecurityType,
} from 'oas/dist/types.cjs';
import { CelAuthTypeEnum } from '../../common/api/model/cel_input_attributes.gen';
import type { CelAuthType } from '../../common';

/**
 * Returns the inner-most schema object for the specified path array.
 */
const getSchemaObject = (obj: object, paths: string[]): any => {
  const attr = paths[0];
  const innerObj = (obj as any)[attr];
  if (paths.length > 1) {
    const newPaths = paths.slice(1);
    return getSchemaObject(innerObj, newPaths);
  } else {
    return innerObj;
  }
};

/**
 * Returns any $ref from the specified schema object, or an empty string if there are none.
 */
const getRefValueOrEmpty = (schemaObj: any): string => {
  if ('content' in schemaObj) {
    const contentObj: MediaTypeObject = schemaObj.content;
    for (const obj of Object.values(contentObj)) {
      if ('schema' in obj) {
        if ('items' in obj.schema) {
          return obj.schema.items.$ref;
        } else {
          return obj.schema.$ref;
        }
      } else if ('$ref' in obj) {
        return obj.$ref;
      }
    }
  } else if ('properties' in schemaObj) {
    for (const obj of Object.values(schemaObj.properties)) {
      if ('items' in (obj as any)) {
        if ('$ref' in (obj as any).items) {
          return (obj as any).items.$ref;
        }
      } else {
        if ('$ref' in (obj as any)) {
          return (obj as any).$ref;
        }
      }
    }
  } else if ('items' in schemaObj) {
    if ('$ref' in (schemaObj as any).items) {
      return (schemaObj as any).items.$ref;
    }
  } else if ('$ref' in (schemaObj as any)) {
    return (schemaObj as any).$ref;
  }
  return '';
};

/**
 * Returns a list of utilized $refs from the specified layer of the schema.
 */
const getRefs = (refs: Set<string>, oas: OASDocument): Set<string> => {
  const layerUsed = new Set<string>();
  for (const ref of refs) {
    const pathSplits = ref.split('/').filter((split: string) => split !== '#');
    if (oas) {
      const schemaObj = getSchemaObject(oas, pathSplits);
      const refVal = getRefValueOrEmpty(schemaObj);
      if (refVal) {
        layerUsed.add(refVal);
      }
    }
  }
  return layerUsed;
};

/**
 * Returns a list of all utilized $refs from the schema.
 */
const buildRefSet = (
  allRefs: Set<string>,
  refsToCheck: Set<string>,
  oas: OASDocument
): Set<string> => {
  if (refsToCheck.size > 0) {
    const addtlRefs = getRefs(refsToCheck, oas);
    const updated = new Set([...allRefs, ...addtlRefs]);
    return buildRefSet(updated, addtlRefs, oas);
  } else {
    return allRefs;
  }
};

/**
 * Retrieves the OAS spec components down to only those utilized by the specified path.
 */
export function reduceSpecComponents(oas: Oas, path: string): ComponentsObject | undefined {
  const operation = oas?.operation(path, 'get');

  const responses = operation?.schema.responses;
  const usedSchemas = new Set<string>();
  if (responses) {
    for (const responseObj of Object.values(responses)) {
      if ('$ref' in responseObj) {
        usedSchemas.add(responseObj.$ref);
      }

      if ('content' in responseObj) {
        const contentObj: MediaTypeObject = responseObj.content;
        for (const obj of Object.values(contentObj)) {
          if ('schema' in obj) {
            if ('items' in obj.schema) {
              usedSchemas.add(obj.schema.items.$ref);
            } else {
              usedSchemas.add(obj.schema.$ref);
            }
          } else if ('$ref' in obj) {
            usedSchemas.add(obj.$ref);
          }
        }
      }
    }
  }

  if (oas?.api) {
    const allUsedSchemas = buildRefSet(usedSchemas, usedSchemas, oas?.api);

    // iterate the schemas and remove those not used
    const reduced: ComponentsObject | undefined = JSON.parse(JSON.stringify(oas?.api.components));
    if (reduced) {
      for (const [componentType, items] of Object.entries(reduced)) {
        for (const component of Object.keys(items)) {
          if (!allUsedSchemas.has(`#/components/${componentType}/${component}`)) {
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
    return specAuthDetails?.Basic ? specAuthDetails?.Basic[0] : undefined;
  } else if (auth === CelAuthTypeEnum.oauth2) {
    return specAuthDetails?.OAuth2 ? specAuthDetails?.OAuth2[0] : undefined;
  } else if (auth === CelAuthTypeEnum.header) {
    return specAuthDetails?.Header ? specAuthDetails?.Header[0] : undefined;
  } else if (auth === CelAuthTypeEnum.digest) {
    return specAuthDetails?.http ? specAuthDetails?.http[0] : undefined;
  } else {
    // should never get here
    throw new Error('unsupported auth method');
  }
}
