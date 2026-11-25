/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactPill } from './impact_pills';

/**
 * Visible pill text. `name` is Entity Store `entity.name` when the store has one, otherwise the
 * name recorded on the impact. The id is the last resort; it is not parsed.
 */
export const entityPillLabel = ({
  name,
  entityId,
}: Pick<ImpactPill, 'name' | 'entityId'>): string => name ?? entityId;

/**
 * Accessible name. When the visible label is a display name, the id is included so two entities
 * that share a name stay distinct, the same way the entity flyout shows the name and the id.
 */
export const entityPillAriaLabel = (pill: Pick<ImpactPill, 'name' | 'entityId'>): string => {
  const label = entityPillLabel(pill);
  return label === pill.entityId ? label : `${label} (${pill.entityId})`;
};
