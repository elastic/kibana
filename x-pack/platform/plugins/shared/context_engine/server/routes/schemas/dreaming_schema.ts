/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  DREAMING_TYPE_PATTERN,
  MAX_DREAMING_CONNECTOR_ID_LENGTH,
  MAX_DREAMING_ENTITY_ATTRIBUTES,
  MAX_DREAMING_ENTITY_TYPES,
  MAX_DREAMING_FACT_TYPES,
  MAX_DREAMING_INSTRUCTIONS_LENGTH,
  MAX_DREAMING_INTERVAL_LENGTH,
  MAX_DREAMING_RELATIONSHIP_TYPES,
  MAX_DREAMING_TYPE_DESCRIPTION_LENGTH,
  MAX_DREAMING_TYPE_LENGTH,
  MIN_DREAMING_INTERVAL_MINUTES,
  RESERVED_ENTITY_ATTRIBUTE_KEYS,
  validateDreamingTypes,
} from '../../../common/dreaming';
import {
  validateDreamingInterval,
  validateLucidDreamingInterval,
  validateRelationshipDreamingInterval,
} from '../../../common/validation';

const validateType = (value: string): string | undefined =>
  DREAMING_TYPE_PATTERN.test(value)
    ? undefined
    : 'Must use lowercase letters, digits, and underscores only.';

const typeSchema = (description: string) =>
  schema.string({
    minLength: 1,
    maxLength: MAX_DREAMING_TYPE_LENGTH,
    validate: validateType,
    meta: { description },
  });

const attributeKeySchema = schema.string({
  minLength: 1,
  maxLength: MAX_DREAMING_TYPE_LENGTH,
  validate: (value) =>
    validateType(value) ??
    (RESERVED_ENTITY_ATTRIBUTE_KEYS.includes(value)
      ? `'${value}' is kept for dreaming's own use.`
      : undefined),
});

const typeDescriptionSchema = schema.maybe(
  schema.string({
    maxLength: MAX_DREAMING_TYPE_DESCRIPTION_LENGTH,
    meta: { description: 'What the type means, as the dreaming model reads it.' },
  })
);

export const dreamingConfigSchema = schema.object(
  {
    enabled: schema.boolean({
      meta: { description: 'Whether dreaming runs on its schedule.' },
    }),
    schedule: schema.maybe(
      schema.object({
        interval: schema.string({
          maxLength: MAX_DREAMING_INTERVAL_LENGTH,
          validate: validateDreamingInterval,
          meta: {
            description: `How often to dream, for example \`1h\` or \`24h\`. At least ${MIN_DREAMING_INTERVAL_MINUTES} minutes. Defaults to \`24h\`.`,
          },
        }),
      })
    ),
    instructions: schema.maybe(
      schema.string({
        maxLength: MAX_DREAMING_INSTRUCTIONS_LENGTH,
        meta: {
          description:
            'What dreaming is told about the AI Index: what it holds, who uses it, and what to record or skip.',
        },
      })
    ),
    connector_id: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: MAX_DREAMING_CONNECTOR_ID_LENGTH,
        meta: {
          description:
            "The AI connector dreaming prompts. Omitted: Context Engine's default model.",
        },
      })
    ),
    facts: schema.maybe(
      schema.nullable(
        schema.arrayOf(
          schema.object({
            type: typeSchema('The fact type, stored as the KI type `fact.<type>`.'),
            description: typeDescriptionSchema,
          }),
          {
            maxSize: MAX_DREAMING_FACT_TYPES,
            meta: { description: 'Fact types to build. Omitted or empty: no facts.' },
          }
        )
      )
    ),
    entities: schema.maybe(
      schema.nullable(
        schema.object(
          {
            nodes: schema.arrayOf(
              schema.object({
                type: typeSchema('The entity type, stored as the KI type `entity.<type>`.'),
                description: typeDescriptionSchema,
                attributes: schema.maybe(
                  schema.arrayOf(attributeKeySchema, {
                    maxSize: MAX_DREAMING_ENTITY_ATTRIBUTES,
                    meta: {
                      description:
                        'Attribute keys, stored on the entity as they are, for example `tier`.',
                    },
                  })
                ),
              }),
              {
                maxSize: MAX_DREAMING_ENTITY_TYPES,
                meta: { description: 'Entity types to build. Empty: no entities.' },
              }
            ),
          },
          {
            meta: {
              description: 'Entity types (nodes). Omitted or null: no entities.',
            },
          }
        )
      )
    ),
    relationships: schema.maybe(
      schema.nullable(
        schema.arrayOf(
          schema.object({
            type: typeSchema(
              'The relationship type, such as `member_of`, stored on the relationship KI as `attributes["relationship.relation"]`.'
            ),
            description: typeDescriptionSchema,
          }),
          {
            maxSize: MAX_DREAMING_RELATIONSHIP_TYPES,
            meta: {
              description:
                'Relationship types between the entities dreaming builds, each stored as a `memory.relationship` KI. When set, facts also link to the entities they are about with the built-in `about` type, which cannot be configured. Omitted or empty: no relationships.',
            },
          }
        )
      )
    ),
    lucid: schema.maybe(
      schema.object(
        {
          enabled: schema.boolean({
            meta: {
              description:
                'Whether facts and entities are built from new memories and agent rounds soon after they arrive, in small batches.',
            },
          }),
          interval: schema.maybe(
            schema.string({
              maxLength: MAX_DREAMING_INTERVAL_LENGTH,
              validate: validateLucidDreamingInterval,
              meta: {
                description:
                  'How often to look for new memories and agent rounds, from `1m` to `59m`. Defaults to `1m`.',
              },
            })
          ),
          connector_id: schema.maybe(
            schema.string({
              minLength: 1,
              maxLength: MAX_DREAMING_CONNECTOR_ID_LENGTH,
              meta: {
                description:
                  'The AI connector lucid dreaming prompts, such as a cheaper model. Omitted: the dreaming connector.',
              },
            })
          ),
        },
        {
          meta: {
            description:
              'Lucid dreaming (experimental). Setting it or `relationship_dreaming` replaces `enabled` and `schedule`; with neither, everything is dreamed on the schedule.',
          },
        }
      )
    ),
    relationship_dreaming: schema.maybe(
      schema.object(
        {
          enabled: schema.boolean({
            meta: { description: 'Whether relationships are linked on their own schedule.' },
          }),
          interval: schema.maybe(
            schema.string({
              maxLength: MAX_DREAMING_INTERVAL_LENGTH,
              validate: validateRelationshipDreamingInterval,
              meta: {
                description: 'How often to link, from `1h` to `30d`. Defaults to `24h`.',
              },
            })
          ),
        },
        {
          meta: {
            description:
              'Relationship dreaming (experimental). Setting it or `lucid` replaces `enabled` and `schedule`.',
          },
        }
      )
    ),
  },
  {
    validate: validateDreamingTypes,
    meta: {
      description:
        'What the AI Index learns from its memories: facts, entities, and the relationships between them.',
    },
  }
);

export const dreamingResponseSchema = () =>
  schema.object({
    dreaming: dreamingConfigSchema,
  });
