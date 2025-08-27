/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import {
  MergeableProperties,
  MergeablePropertiesKeys,
  PropertyConflict,
} from '@kbn/content-packs-schema';
import { FieldDefinition, RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
import { Resolver } from './helpers';

export function mergeQuery({
  base,
  existing,
  incoming,
  resolver,
}: {
  base?: StreamQuery;
  existing?: StreamQuery;
  incoming?: StreamQuery;
  resolver: Resolver<StreamQuery>;
}): { value?: StreamQuery; conflict?: PropertyConflict<'query'> } {
  const { value, conflict } = mergeProperty<'query'>({
    base,
    existing,
    incoming,
    resolver,
  });
  if (!conflict) {
    return { value };
  }

  return {
    value,
    conflict: {
      type: 'query',
      id: (base?.id ?? existing?.id ?? incoming?.id)!,
      value: conflict,
    },
  };
}

export function mergeField({
  base,
  existing,
  incoming,
  resolver,
}: {
  base?: FieldDefinition;
  existing?: FieldDefinition;
  incoming?: FieldDefinition;
  resolver: Resolver<FieldDefinition>;
}): { value?: FieldDefinition; conflict?: PropertyConflict<'field'> } {
  const { value, conflict } = mergeProperty<'field'>({
    base,
    existing,
    incoming,
    resolver,
  });
  if (!conflict) {
    return { value };
  }

  const id = Object.keys((base ?? existing ?? incoming)!)[0];

  return {
    value,
    conflict: {
      type: 'field',
      id,
      value: conflict,
    },
  };
}

export function mergeRoutingDefinition({
  base,
  existing,
  incoming,
  resolver,
}: {
  base?: RoutingDefinition;
  existing?: RoutingDefinition;
  incoming?: RoutingDefinition;
  resolver: Resolver<RoutingDefinition>;
}): { value?: RoutingDefinition; conflict?: PropertyConflict<'routing'> } {
  const { value, conflict } = mergeProperty<'routing'>({
    base,
    existing,
    incoming,
    resolver,
  });
  if (!conflict) {
    return { value };
  }

  return {
    value,
    conflict: {
      type: 'routing',
      id: (base?.destination ?? existing?.destination ?? incoming?.destination)!,
      value: conflict,
    },
  };
}

function mergeProperty<K extends MergeablePropertiesKeys = MergeablePropertiesKeys>({
  base,
  existing,
  incoming,
  resolver,
}: {
  base?: MergeableProperties[K];
  existing?: MergeableProperties[K];
  incoming?: MergeableProperties[K];
  resolver: Resolver<MergeableProperties[K]>;
}): { value?: MergeableProperties[K]; conflict?: PropertyConflict<K>['value'] } {
  if (isEqual(existing, incoming)) {
    if (!existing && !incoming) {
      return {}; // both deleted
    }
    if (existing && !isEqual(base, existing) && !isEqual(base, incoming)) {
      return { value: existing }; // both changed same way
    }

    return { value: existing };
  }

  // Case 2: User deleted it
  if (!existing && base) {
    if (!incoming || isEqual(base, incoming)) {
      return {}; // both deleted
    }

    // user deleted, incoming changed
    const resolution = resolver(existing, incoming);
    return {
      value: resolution.value,
      conflict: { source: resolution.source, current: existing, incoming },
    };
  }

  // Case 3: User did not change (existing === base) → take incoming
  if (isEqual(base, existing) && !isEqual(base, incoming)) {
    return { value: incoming };
  }

  // Case 4: Base missing (new install)
  if (!base) {
    if (!existing) {
      return { value: incoming }; // brand new
    }
    if (!incoming) {
      return { value: existing }; // user added, incoming deleted
    }
    if (!isEqual(existing, incoming)) {
      // both added differently
      const resolution = resolver(existing, incoming);
      return {
        value: resolution.value,
        conflict: { source: resolution.source, current: existing, incoming },
      };
    }

    return { value: existing }; // both added same
  }

  // Case 5: User changed it
  if (!isEqual(base, existing)) {
    if (!isEqual(base, incoming) && !isEqual(existing, incoming)) {
      const resolution = resolver(existing, incoming);
      return {
        value: resolution.value,
        conflict: { source: resolution.source, current: existing, incoming },
      };
    }
    return { value: existing }; // incoming didn’t change or matches existing
  }

  // Default: just take incoming
  return { value: incoming };
}
