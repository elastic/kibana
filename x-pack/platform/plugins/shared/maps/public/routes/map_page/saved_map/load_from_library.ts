/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSimpleSavedObject, SavedObjectReference } from '@kbn/core/public';
import type { MapAttributes } from '../../../../common/content_management';
import { getMapClient } from '../../../content_management';
import { injectReferences } from '../../../../common/migrations/references';

export interface SharingSavedObjectProps {
  outcome?: ResolvedSimpleSavedObject['outcome'];
  aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
  aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
  sourceId?: string;
}

export async function loadFromLibrary(savedObjectId: string): Promise<{
  attributes: MapAttributes;
  sharingSavedObjectProps: SharingSavedObjectProps;
  managed: boolean;
  references?: SavedObjectReference[];
}> {
  const {
    item: savedObject,
    meta: { outcome, aliasPurpose, aliasTargetId },
  } = await getMapClient<MapAttributes>().get(savedObjectId);

  if (savedObject.error) {
    throw savedObject.error;
  }

  const { attributes } = injectReferences(savedObject);

  return {
    attributes,
    sharingSavedObjectProps: {
      aliasTargetId,
      outcome,
      aliasPurpose,
      sourceId: savedObjectId,
    },
    managed: Boolean(savedObject.managed),
    references: savedObject.references,
  };
}
