/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityStoreIdType } from '../../impact/open_impact_entity';
import type { ImpactPill } from './impact_pills';

const LOCAL_NAMESPACE = '@local';

/**
 * What an Impact pill shows. Prefer the stored display name. Without one, drop the Entity Store
 * `type:` prefix; a local user id (`user:{name}@{host}@local`) keeps only `{name}`.
 */
export const entityPillLabel = ({
  name,
  entityId,
}: Pick<ImpactPill, 'name' | 'entityId'>): string => {
  if (name) {
    return name;
  }
  const type = entityStoreIdType(entityId);
  if (!type) {
    return entityId;
  }
  const body = entityId.slice(type.length + 1);
  if (type !== 'user' || !body.endsWith(LOCAL_NAMESPACE)) {
    return body;
  }
  const userName = body.slice(0, body.indexOf('@'));
  return userName.length > 0 ? userName : body;
};
