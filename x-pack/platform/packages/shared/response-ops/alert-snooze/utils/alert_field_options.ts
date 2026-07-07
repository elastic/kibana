/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { FieldDescriptor } from '@kbn/data-views-plugin/server';

/**
 * Field types that never resolve to a scalar leaf value via the dot-path
 * traversal used by the per-alert snooze snapshot logic, so they must not be
 * offered as `field_change` targets.
 */
const NON_SCALAR_FIELD_TYPES = new Set(['object', 'nested']);

/**
 * Maps the alert index fields down to the leaf-level scalar fields that the
 * `field_change` snooze condition can reliably capture, returning them as
 * `EuiComboBox` options. Object/nested containers and nested-object leaves are
 * excluded because their dot-path snapshot resolves to `null` (see issue
 * #275054). Options are de-duplicated by name and sorted alphabetically.
 */
export const toLeafScalarFieldOptions = (
  fields: FieldDescriptor[]
): Array<EuiComboBoxOptionOption<string>> => {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const field of fields) {
    if (!field?.name) continue;
    if (NON_SCALAR_FIELD_TYPES.has(field.type)) continue;
    if (field.subType?.nested) continue;
    if (seen.has(field.name)) continue;

    seen.add(field.name);
    names.push(field.name);
  }

  return names.sort((a, b) => a.localeCompare(b)).map((name) => ({ label: name, value: name }));
};
