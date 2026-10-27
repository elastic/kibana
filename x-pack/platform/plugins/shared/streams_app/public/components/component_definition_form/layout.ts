/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueFieldGroup, CatalogueNamedFieldDefinition } from '@kbn/streams-schema';

export interface FieldSection {
  group?: CatalogueFieldGroup;
  fields: CatalogueNamedFieldDefinition[];
}

const orderOf = (field: CatalogueNamedFieldDefinition): number =>
  field.ui?.order ?? Number.MAX_SAFE_INTEGER;

/** Orders fields by `ui.order`; definition order breaks ties. */
export const orderFields = (
  fields: readonly CatalogueNamedFieldDefinition[]
): CatalogueNamedFieldDefinition[] =>
  [...fields].sort((left, right) => orderOf(left) - orderOf(right));

/** Ungrouped fields first, then each declared group in `order`. */
export const layoutSections = (
  fields: readonly CatalogueNamedFieldDefinition[],
  groups: readonly CatalogueFieldGroup[] | undefined
): FieldSection[] => {
  const declared = [...(groups ?? [])].sort(
    (left, right) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
  );
  const declaredIds = new Set(declared.map(({ id }) => id));
  const ungrouped = fields.filter(({ ui }) => !ui?.group || !declaredIds.has(ui.group));
  const sections: FieldSection[] = ungrouped.length > 0 ? [{ fields: ungrouped }] : [];
  for (const group of declared) {
    const grouped = fields.filter(({ ui }) => ui?.group === group.id);
    if (grouped.length > 0) {
      sections.push({ group, fields: grouped });
    }
  }
  return sections;
};
