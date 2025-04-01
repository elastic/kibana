/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import _ from 'lodash';

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import { GLOBAL_RESOURCE } from './constants';

/**
 * Elasticsearch specific portion of the role definition.
 * See more details at https://www.elastic.co/guide/en/elasticsearch/reference/master/security-api.html#security-role-apis.
 */
export const elasticsearchRoleSchema = schema.object({
  /**
   * An optional list of cluster privileges. These privileges define the cluster level actions that
   * users with this role are able to execute
   */
  cluster: schema.maybe(
    schema.arrayOf(
      schema.string({
        meta: {
          description:
            'Cluster privileges that define the cluster level actions that users can perform.',
        },
      })
    )
  ),
  /**
   * An optional list of remote cluster privileges. These privileges define the remote cluster level actions that
   * users with this role are able to execute
   */
  remote_cluster: schema.maybe(
    schema.arrayOf(
      schema.object({
        privileges: schema.arrayOf(
          schema.string({
            meta: {
              description:
                'The cluster level privileges for the remote cluster. The allowed values are a subset of the cluster privileges.',
            },
          }),
          { minSize: 1 }
        ),
        clusters: schema.arrayOf(
          schema.string({
            meta: {
              description:
                'A list of remote cluster aliases. It supports literal strings as well as wildcards and regular expressions.',
            },
          }),
          { minSize: 1 }
        ),
      })
    )
  ),

  /**
   * An optional list of indices permissions entries.
   */
  indices: schema.maybe(
    schema.arrayOf(
      schema.object({
        /**
         * Required list of indices (or index name patterns) to which the permissions in this
         * entry apply.
         */
        names: schema.arrayOf(
          schema.string({
            meta: {
              description:
                'The data streams, indices, and aliases to which the permissions in this entry apply. It supports wildcards (*).',
            },
          }),
          { minSize: 1 }
        ),

        /**
         * An optional set of the document fields that the owners of the role have read access to.
         */
        field_security: schema.maybe(
          schema.recordOf(
            schema.oneOf([schema.literal('grant'), schema.literal('except')]),
            schema.arrayOf(
              schema.string({
                meta: {
                  description: 'The document fields that the role members have read access to.',
                },
              })
            )
          )
        ),

        /**
         * Required list of the index level privileges that the owners of the role have on the
         * specified indices.
         */
        privileges: schema.arrayOf(
          schema.string({
            meta: {
              description:
                'The index level privileges that the role members have for the data streams and indices.',
            },
          }),
          { minSize: 1 }
        ),

        /**
         * An optional search query that defines the documents the owners of the role have read access
         * to. A document within the specified indices must match this query in order for it to be
         * accessible by the owners of the role.
         */
        query: schema.maybe(
          schema.string({
            meta: {
              description:
                'A search query that defines the documents the role members have read access to. A document within the specified data streams and indices must match this query in order for it to be accessible by the role members.',
            },
          })
        ),

        /**
         * An optional flag used to indicate if index pattern wildcards or regexps should cover
         * restricted indices.
         */
        allow_restricted_indices: schema.maybe(
          schema.boolean({
            meta: {
              description:
                'Restricted indices are a special category of indices that are used internally to store configuration data and should not be directly accessed. Only internal system roles should normally grant privileges over the restricted indices. Toggling this flag is very strongly discouraged because it could effectively grant unrestricted operations on critical data, making the entire system unstable or leaking sensitive information. If for administrative purposes you need to create a role with privileges covering restricted indices, however, you can set this property to true. In that case, the names field covers the restricted indices too.',
            },
          })
        ),
      })
    )
  ),

  /**
   * An optional list of remote indices permissions entries.
   */
  remote_indices: schema.maybe(
    schema.arrayOf(
      schema.object({
        /**
         * Required list of remote clusters to which the permissions in this entry apply.
         */
        clusters: schema.arrayOf(
          schema.string({
            meta: {
              description:
                'A list of remote cluster aliases. It supports literal strings as well as wildcards and regular expressions.',
            },
          }),
          { minSize: 1 }
        ),

        /**
         * Required list of remote indices (or index name patterns) to which the permissions in this
         * entry apply.
         */
        names: schema.arrayOf(
          schema.string({
            meta: {
              description:
                'A list of remote aliases, data streams, or indices to which the permissions apply. It supports wildcards (*).',
            },
          }),
          { minSize: 1 }
        ),

        /**
         * An optional set of the document fields that the owners of the role have read access to.
         */
        field_security: schema.maybe(
          schema.recordOf(
            schema.oneOf([schema.literal('grant'), schema.literal('except')]),
            schema.arrayOf(
              schema.string({
                meta: {
                  description: 'The document fields that the role members have read access to.',
                },
              })
            )
          )
        ),

        /**
         * Required list of the index level privileges that the owners of the role have on the
         * specified indices.
         */
        privileges: schema.arrayOf(
          schema.string({
            meta: {
              description:
                'The index level privileges that role members have for the specified indices.',
            },
          }),
          { minSize: 1 }
        ),

        /**
         * An optional search query that defines the documents the owners of the role have read access
         * to. A document within the specified indices must match this query in order for it to be
         * accessible by the owners of the role.
         */
        query: schema.maybe(
          schema.string({
            meta: {
              description:
                'A search query that defines the documents the role members have read access to. A document within the specified data streams and indices must match this query in order for it to be accessible by the role members. ',
            },
          })
        ),

        /**
         * An optional flag used to indicate if index pattern wildcards or regexps should cover
         * restricted indices.
         */
        allow_restricted_indices: schema.maybe(
          schema.boolean({
            meta: {
              description:
                'Restricted indices are a special category of indices that are used internally to store configuration data and should not be directly accessed. Only internal system roles should normally grant privileges over the restricted indices. Toggling this flag is very strongly discouraged because it could effectively grant unrestricted operations on critical data, making the entire system unstable or leaking sensitive information. If for administrative purposes you need to create a role with privileges covering restricted indices, however, you can set this property to true. In that case, the names field will cover the restricted indices too.',
            },
          })
        ),
      })
    )
  ),

  /**
   * An optional list of users that the owners of this role can impersonate.
   */
  run_as: schema.maybe(
    schema.arrayOf(
      schema.string({
        meta: { description: 'A user name that the role member can impersonate.' },
      })
    )
  ),
});

const allSpacesSchema = schema.arrayOf(schema.literal(GLOBAL_RESOURCE), {
  minSize: 1,
  maxSize: 1,
});

/**
 * Schema for the list of space IDs used within Kibana specific role definition.
 */
const spacesSchema = schema.oneOf(
  [
    allSpacesSchema,
    schema.arrayOf(
      schema.string({
        meta: { description: 'A space that the privilege applies to.' },
        validate(value) {
          if (!/^[a-z0-9_-]+$/.test(value)) {
            return `must be lower case, a-z, 0-9, '_', and '-' are allowed`;
          }
        },
      })
    ),
  ],
  { defaultValue: [GLOBAL_RESOURCE] }
);

const FEATURE_NAME_VALUE_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Kibana specific portion of the role definition. It's represented as a list of base and/or
 * feature Kibana privileges. None of the entries should apply to the same spaces.
 */
export const getKibanaRoleSchema = (
  getBasePrivilegeNames: () => { global: string[]; space: string[] }
) =>
  schema.arrayOf(
    schema.object(
      {
        /**
         * An optional list of space IDs to which the permissions in this entry apply. If not
         * specified it defaults to special "global" space ID (all spaces).
         */
        spaces: spacesSchema,

        /**
         * An optional list of Kibana base privileges. If this entry applies to special "global"
         * space (all spaces) then specified base privileges should be within known base "global"
         * privilege list, otherwise - within known "space" privilege list. Base privileges
         * definition isn't allowed when feature privileges are defined and required otherwise.
         */
        base: schema.maybe(
          schema.conditional(
            schema.siblingRef('spaces'),
            allSpacesSchema,
            schema.arrayOf(
              schema.string({
                meta: { description: 'A base privilege that grants applies to all spaces.' },
                validate(value) {
                  const globalPrivileges = getBasePrivilegeNames().global;
                  if (!globalPrivileges.some((privilege) => privilege === value)) {
                    return `unknown global privilege "${value}", must be one of [${globalPrivileges}]`;
                  }
                },
              })
            ),
            schema.arrayOf(
              schema.string({
                meta: { description: 'A base privilege that applies to specific spaces.' },
                validate(value) {
                  const spacePrivileges = getBasePrivilegeNames().space;
                  if (!spacePrivileges.some((privilege) => privilege === value)) {
                    return `unknown space privilege "${value}", must be one of [${spacePrivileges}]`;
                  }
                },
              })
            )
          )
        ),

        /**
         * An optional dictionary of Kibana feature privileges where the key is the ID of the
         * feature and the value is a list of feature specific privilege IDs. Both feature and
         * privilege IDs should consist of allowed set of characters. Feature privileges
         * definition isn't allowed when base privileges are defined and required otherwise.
         */
        feature: schema.maybe(
          schema.recordOf(
            schema.string({
              meta: { description: 'The name of a feature.' },
              validate(value) {
                if (!FEATURE_NAME_VALUE_REGEX.test(value)) {
                  return `only a-z, A-Z, 0-9, '_', and '-' are allowed`;
                }
              },
            }),
            schema.arrayOf(
              schema.string({
                meta: { description: 'The privileges that the role member has for the feature.' },
                validate(value) {
                  if (!FEATURE_NAME_VALUE_REGEX.test(value)) {
                    return `only a-z, A-Z, 0-9, '_', and '-' are allowed`;
                  }
                },
              })
            )
          )
        ),
      },
      {
        validate(value) {
          if (
            (value.base === undefined || value.base.length === 0) &&
            (value.feature === undefined || Object.values(value.feature).flat().length === 0)
          ) {
            return 'either [base] or [feature] is expected, but none of them specified';
          }

          if (
            value.base !== undefined &&
            value.base.length > 0 &&
            value.feature !== undefined &&
            Object.keys(value.feature).length > 0
          ) {
            return `definition of [feature] isn't allowed when non-empty [base] is defined.`;
          }
        },
      }
    ),
    {
      validate(value) {
        for (const [indexA, valueA] of value.entries()) {
          for (const valueB of value.slice(indexA + 1)) {
            const spaceIntersection = _.intersection(valueA.spaces, valueB.spaces);
            if (spaceIntersection.length !== 0) {
              return `more than one privilege is applied to the following spaces: [${spaceIntersection}]`;
            }
          }
        }
      },
    }
  );

export type ElasticsearchPrivilegesType = TypeOf<typeof elasticsearchRoleSchema>;
export type KibanaPrivilegesType = TypeOf<ReturnType<typeof getKibanaRoleSchema>>;
