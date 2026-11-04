/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelUnsafeTransformFn } from '@kbn/core-saved-objects-server';
import type {
  RuleSavedObjectAttributes,
  RuleSavedObjectAttributesV4,
} from '../schemas/rule_saved_object_attributes';
import { collapseLegacyRuleShape } from '../legacy_rule_shape';

/**
 * Adds the collapsed `query`, the `recovery` / `no_data` objects and the nested
 * `state_transition` phases.
 *
 * The pre-collapse keys stay on disk: model version 6's schema requires
 * `query.format` and a present `query.breach`, so removing them would leave a
 * rolled-back node unable to read migrated rules. Nothing reads or writes them
 * from here on, and model version 8 removes them.
 *
 * `query.breach` is the one key both shapes claim, so the legacy value is kept
 * and readers go through `hasBreachCondition`, which reads a blank or absent
 * `segment` as "no breach condition".
 */
export const migrateRuleQueryShape: SavedObjectModelUnsafeTransformFn<
  RuleSavedObjectAttributesV4,
  RuleSavedObjectAttributes
> = (doc) => {
  const { query, state_transition: stateTransition, ...attributes } = doc.attributes;

  const collapsed = collapseLegacyRuleShape({
    kind: attributes.kind,
    query,
    recovery_strategy: attributes.recovery_strategy,
    no_data_strategy: attributes.no_data_strategy,
    state_transition: stateTransition,
  });

  return {
    document: {
      ...doc,
      attributes: {
        ...attributes,
        ...collapsed,
        query: { ...query, ...collapsed.query },
        ...(stateTransition
          ? { state_transition: { ...stateTransition, ...collapsed.state_transition } }
          : {}),
      },
    },
  };
};
