/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { elasticsearchRoleSchema } from '@kbn/security-plugin-types-server';

const metadataSchema = schema.recordOf(
  schema.string({
    meta: {
      description: 'A metadata dictionary. Keys that begin with `_` are reserved for system usage.',
    },
  }),
  schema.any()
);

const roleKibanaPrivilegeResponseSchema = schema.object(
  {
    // codeql[js/kibana/unbounded-array-in-schema] Response schema for role privileges sourced from Elasticsearch, not user HTTP input
    spaces: schema.arrayOf(
      schema.string({
        meta: {
          description:
            'A space that the privilege applies to. The wildcard `*` indicates all spaces.',
        },
      })
    ),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema for role privileges sourced from Elasticsearch, not user HTTP input
    base: schema.arrayOf(
      schema.string({
        meta: { description: 'A base Kibana privilege.' },
      })
    ),
    feature: schema.recordOf(
      schema.string({ meta: { description: 'The name of a Kibana feature.' } }),
      // codeql[js/kibana/unbounded-array-in-schema] Response schema for role privileges sourced from Elasticsearch, not user HTTP input
      schema.arrayOf(
        schema.string({
          meta: { description: 'A privilege the role member has for the feature.' },
        })
      )
    ),
    _reserved: schema.maybe(
      // codeql[js/kibana/unbounded-array-in-schema] Response schema for role privileges sourced from Elasticsearch, not user HTTP input
      schema.arrayOf(
        schema.string({
          meta: { description: 'A reserved Kibana privilege granted globally.' },
        })
      )
    ),
  },
  {
    meta: {
      id: 'security_role_kibana_privilege_response',
      description: 'A Kibana privilege entry returned for a role.',
    },
  }
);

const roleKibanaApplicationSchema = schema.object(
  {
    application: schema.string(),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema for ES application privileges, not user HTTP input
    privileges: schema.arrayOf(schema.string()),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema for ES application privileges, not user HTTP input
    resources: schema.arrayOf(schema.string()),
  },
  {
    meta: {
      id: 'security_role_kibana_application',
      description: 'A raw Elasticsearch application privilege entry tied to Kibana.',
    },
  }
);

const roleTransformErrorSchema = schema.object(
  {
    reason: schema.string({
      meta: { description: 'The reason the role could not be fully transformed.' },
    }),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema describing role transform diagnostics, not user HTTP input
    state: schema.maybe(schema.arrayOf(roleKibanaApplicationSchema)),
  },
  {
    meta: {
      id: 'security_role_transform_error',
      description:
        'Diagnostic information about a role whose Kibana privileges could not be transformed.',
    },
  }
);

export const roleResponseSchema = schema.object(
  {
    name: schema.string({ meta: { description: 'The role name.' } }),
    description: schema.maybe(
      schema.string({ meta: { description: 'A description for the role.' } })
    ),
    elasticsearch: elasticsearchRoleSchema,
    // codeql[js/kibana/unbounded-array-in-schema] Response schema describing roles fetched from Elasticsearch, not user HTTP input
    kibana: schema.arrayOf(roleKibanaPrivilegeResponseSchema),
    metadata: schema.maybe(metadataSchema),
    transient_metadata: schema.maybe(metadataSchema),
    // codeql[js/kibana/unbounded-array-in-schema] Response schema describing roles fetched from Elasticsearch, not user HTTP input
    _transform_error: schema.maybe(schema.arrayOf(roleTransformErrorSchema)),
    _unrecognized_applications: schema.maybe(
      // codeql[js/kibana/unbounded-array-in-schema] Response schema describing roles fetched from Elasticsearch, not user HTTP input
      schema.arrayOf(
        schema.string({
          meta: {
            description: 'Application names found on the role that are not recognized by Kibana.',
          },
        })
      )
    ),
  },
  {
    meta: {
      id: 'security_role_response',
      description: 'A Kibana role definition returned by the Roles API.',
    },
  }
);

// codeql[js/kibana/unbounded-array-in-schema] Response schema for GET /api/security/role, server-populated from Elasticsearch
export const getRolesResponseSchema = schema.arrayOf(roleResponseSchema);

export const queryRolesResponseSchema = schema.object(
  {
    // codeql[js/kibana/unbounded-array-in-schema] Response schema for paginated roles query, server-populated from Elasticsearch
    roles: schema.arrayOf(roleResponseSchema),
    count: schema.number({
      meta: { description: 'The number of roles returned in this response page.' },
    }),
    total: schema.number({
      meta: { description: 'The total number of roles that match the query.' },
    }),
  },
  {
    meta: {
      id: 'security_query_roles_response',
      description: 'The response payload for a roles query.',
    },
  }
);

const bulkRolesErrorDetailsSchema = schema.recordOf(
  schema.string({ meta: { description: 'The role name.' } }),
  schema.object(
    {
      type: schema.string({ meta: { description: 'The error type.' } }),
      reason: schema.string({ meta: { description: 'A human readable error reason.' } }),
    },
    {
      meta: {
        id: 'security_bulk_roles_error_detail',
        description: 'Error information for a single role in a bulk create-or-update request.',
      },
    }
  )
);

export const bulkCreateOrUpdateRolesResponseSchema = schema.object(
  {
    created: schema.maybe(
      // codeql[js/kibana/unbounded-array-in-schema] Response schema mirroring caller's bulk request size, not new user input
      schema.arrayOf(
        schema.string({ meta: { description: 'The name of a role that was created.' } })
      )
    ),
    updated: schema.maybe(
      // codeql[js/kibana/unbounded-array-in-schema] Response schema mirroring caller's bulk request size, not new user input
      schema.arrayOf(
        schema.string({ meta: { description: 'The name of a role that was updated.' } })
      )
    ),
    noop: schema.maybe(
      // codeql[js/kibana/unbounded-array-in-schema] Response schema mirroring caller's bulk request size, not new user input
      schema.arrayOf(
        schema.string({
          meta: { description: 'The name of a role that was unchanged by the request.' },
        })
      )
    ),
    errors: schema.maybe(bulkRolesErrorDetailsSchema),
  },
  {
    meta: {
      id: 'security_bulk_create_or_update_roles_response',
      description: 'The response payload for the bulk create-or-update roles API.',
    },
  }
);
