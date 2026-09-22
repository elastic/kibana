/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  actionPolicySavedObjectAttributesSchemaV1,
  actionPolicySavedObjectAttributesSchemaV2,
} from '../schemas/action_policy_saved_object_attributes';
import type { ActionPolicySavedObjectAttributesV1 } from '../schemas/action_policy_saved_object_attributes';

export const actionPolicyModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      /**
       * After the v2 migration `auth` is removed from every document. Make it
       * optional here so that v2 docs can be down-converted to v1 during a
       * rollback without a validation failure. The `create` schema stays strict
       * (required `auth`) because v1 writes should always include it.
       */
      forwardCompatibility: actionPolicySavedObjectAttributesSchemaV1.extends(
        {
          auth: schema.maybe(
            schema.object({
              apiKey: schema.maybe(schema.string()),
              owner: schema.maybe(schema.string()),
              createdByUser: schema.maybe(schema.boolean()),
            })
          ),
        },
        { unknowns: 'ignore' }
      ),
      create: actionPolicySavedObjectAttributesSchemaV1,
    },
  },
  /**
   * v2 migrates action policies from the v1 nested `auth` layout to flat
   * top-level attributes so the Encrypted Saved Objects service can correctly
   * encrypt `apiKey` and bind `apiKeyOwner` / `apiKeyCreatedByUser` into AAD.
   *
   * ESO resolves attribute names via `Object.hasOwn(attributes, key)`, which
   * silently ignores dotted paths (`auth.apiKey`, `auth.owner`, …). On v1,
   * action-policy API keys were therefore stored in plaintext. This migration:
   *   1. Backfills `apiKeyOwner` ← `auth.owner` and
   *      `apiKeyCreatedByUser` ← `auth.createdByUser`.
   *   2. Removes `auth.apiKey` (the formerly-plaintext secret). The flat `apiKey`
   *      field is NOT populated — copying a plaintext value into a field ESO now
   *      treats as ciphertext would cause every subsequent decrypt to fail. An
   *      absent `apiKey` is safe: the dispatcher logs a warning and skips the
   *      group until the policy is re-saved and a new key is generated.
   *   Note: `auth.{owner,createdByUser}` are kept in the document (now optional in
   *   v2 schema) so that the ZDT/rollback pipeline can successfully down-convert
   *   a v2 doc back to v1 without losing the `auth` container that v1 expects.
   *
   * A plain model version (not `createModelVersion`) is correct here because
   * there was never anything encrypted to decrypt; the wrapper would also throw
   * since `inputType.attributesToEncrypt` must be non-empty.
   */
  '2': {
    changes: [
      {
        type: 'data_backfill',
        backfillFn: (doc, context) => {
          const { auth } = doc.attributes as ActionPolicySavedObjectAttributesV1;
          if (!auth) {
            context.log.warn(
              `Action policy '${doc.id}' is missing 'auth' attributes; backfilling empty API key ownership.`
            );
          }
          return {
            attributes: {
              apiKeyOwner: auth?.owner ?? '',
              apiKeyCreatedByUser: auth?.createdByUser ?? false,
            },
          };
        },
      },
      {
        type: 'data_removal',
        removedAttributePaths: ['auth.apiKey'],
      },
    ],
    schemas: {
      forwardCompatibility: actionPolicySavedObjectAttributesSchemaV2.extends(
        {},
        { unknowns: 'ignore' }
      ),
      create: actionPolicySavedObjectAttributesSchemaV2,
    },
  },
};
