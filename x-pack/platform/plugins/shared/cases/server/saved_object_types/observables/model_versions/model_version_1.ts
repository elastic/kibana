/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_ISO_DATE_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OWNER_LENGTH,
  MAX_STORED_OBSERVABLE_FIELD_LENGTH,
  MAX_USERNAME_LENGTH,
} from '../../../../common/constants';

// The schemas declare every stored attribute, indexed or not. `create` rejects
// unknown attributes; `forwardCompatibility` drops the ones a later model
// version adds, so a node on this version can read objects a newer node wrote.

// Values and descriptions are bounded by the stored-field limit rather than the
// request limit, so an observable moved or imported from the case field, which
// predates the request bounds, still validates. User fields reuse the username
// bound. This model version is released, so its bounds must not change.

const buildSchema = (unknowns: 'forbid' | 'ignore') => {
  const userFieldSchema = schema.maybe(
    schema.nullable(schema.string({ maxLength: MAX_USERNAME_LENGTH }))
  );

  const userSchema = schema.object(
    {
      username: userFieldSchema,
      full_name: userFieldSchema,
      email: userFieldSchema,
      profile_uid: schema.maybe(schema.string({ maxLength: MAX_USERNAME_LENGTH })),
    },
    { unknowns }
  );

  return schema.object(
    {
      owner: schema.string({ maxLength: MAX_OWNER_LENGTH }),
      type_key: schema.string({ maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }),
      value: schema.string({ maxLength: MAX_STORED_OBSERVABLE_FIELD_LENGTH }),
      description: schema.nullable(
        schema.string({ maxLength: MAX_STORED_OBSERVABLE_FIELD_LENGTH })
      ),
      source_attachment_id: schema.nullable(schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH })),
      created_at: schema.string({ maxLength: MAX_ISO_DATE_LENGTH }),
      created_by: userSchema,
      updated_at: schema.nullable(schema.string({ maxLength: MAX_ISO_DATE_LENGTH })),
      updated_by: schema.nullable(userSchema),
    },
    { unknowns }
  );
};

/** Baseline model version of `cases-observables`. */
export const modelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: buildSchema('ignore'),
    create: buildSchema('forbid'),
  },
};
