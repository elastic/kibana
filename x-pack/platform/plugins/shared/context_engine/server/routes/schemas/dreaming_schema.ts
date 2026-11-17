/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  DEFAULT_ENRICHMENT_MAX_DOCUMENTS,
  DEFAULT_ENRICHMENT_REFRESH_AFTER,
  DEFAULT_WIKI_MAX_PAGES,
  DREAMING_KI_TYPE_FILTER_PATTERN,
  DREAMING_TYPE_PATTERN,
  MAX_DREAMING_CONNECTOR_ID_LENGTH,
  MAX_DREAMING_ENTITY_ATTRIBUTES,
  MAX_DREAMING_ENTITY_TYPES,
  MAX_DREAMING_FACT_TYPES,
  MAX_DREAMING_INSTRUCTIONS_LENGTH,
  MAX_DREAMING_INTERVAL_LENGTH,
  MAX_DREAMING_KI_TYPE_FILTERS,
  MAX_DREAMING_RELATIONSHIP_TYPES,
  MAX_DREAMING_TYPE_DESCRIPTION_LENGTH,
  MAX_DREAMING_TYPE_LENGTH,
  MAX_ENRICHMENT_MAX_DOCUMENTS,
  MAX_WIKI_MAX_PAGES,
  MIN_DREAMING_INTERVAL_MINUTES,
  RESERVED_ENTITY_ATTRIBUTE_KEYS,
  WIKI_PAGE_KI_TYPE,
  validateDreamingConfig,
} from '../../../common/dreaming';
import { validateDreamingInterval } from '../../../common/validation';

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

const kiTypeFiltersSchema = (description: string) =>
  schema.maybe(
    schema.arrayOf(
      schema.string({
        minLength: 1,
        maxLength: MAX_DREAMING_TYPE_LENGTH,
        validate: (value) =>
          DREAMING_KI_TYPE_FILTER_PATTERN.test(value)
            ? undefined
            : 'Must be a KI type such as `entity.customer`, or a prefix such as `fact.*`.',
      }),
      { maxSize: MAX_DREAMING_KI_TYPE_FILTERS, meta: { description } }
    )
  );

const promptSchema = (description: string) =>
  schema.maybe(
    schema.string({ maxLength: MAX_DREAMING_INSTRUCTIONS_LENGTH, meta: { description } })
  );

const enrichmentSchema = schema.object(
  {
    enabled: schema.boolean({
      meta: { description: 'Whether enrichment runs on the dreaming schedule.' },
    }),
    selection: promptSchema(
      'Which knowledge items are worth improving, as the model that picks them reads it.'
    ),
    improvement: promptSchema(
      'What to improve them in: what to look for in the sources of the AI Index, and what to add.'
    ),
    ki_types: kiTypeFiltersSchema(
      'The KI types to improve, each an exact type such as `entity.customer` or a prefix such as `fact.*`. Omitted or empty: `fact.*` and `entity.*`.'
    ),
    max_documents: schema.maybe(
      schema.number({
        min: 1,
        max: MAX_ENRICHMENT_MAX_DOCUMENTS,
        meta: {
          description: `At most how many knowledge items one run improves. Defaults to ${DEFAULT_ENRICHMENT_MAX_DOCUMENTS}.`,
        },
      })
    ),
    refresh_after: schema.maybe(
      schema.string({
        maxLength: MAX_DREAMING_INTERVAL_LENGTH,
        validate: validateDreamingInterval,
        meta: {
          description: `How long an improved knowledge item that has not changed is left alone, for example \`7d\`. Defaults to \`${DEFAULT_ENRICHMENT_REFRESH_AFTER}\`.`,
        },
      })
    ),
  },
  {
    meta: {
      description:
        'Pulls more information into existing knowledge items from the ES|QL and connector sources of the AI Index.',
    },
  }
);

const wikiSchema = schema.object(
  {
    enabled: schema.boolean({
      meta: { description: 'Whether wiki pages are built on the dreaming schedule.' },
    }),
    instructions: promptSchema('Which overview pages to build and how to write them.'),
    ki_types: kiTypeFiltersSchema(
      'The KI types pages are built from, each an exact type or a prefix such as `fact.*`. Omitted or empty: `fact.*` and `entity.*`.'
    ),
    max_pages: schema.maybe(
      schema.number({
        min: 1,
        max: MAX_WIKI_MAX_PAGES,
        meta: {
          description: `At most how many pages one run creates or updates. Defaults to ${DEFAULT_WIKI_MAX_PAGES}.`,
        },
      })
    ),
    research: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'Whether pages also draw on the ES|QL and connector sources of the AI Index. Defaults to `true`.',
        },
      })
    ),
  },
  {
    meta: {
      description: `Builds wiki-style overview pages, stored as \`${WIKI_PAGE_KI_TYPE}\` knowledge items, that tie related knowledge items together.`,
    },
  }
);

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
    enrichment: schema.maybe(schema.nullable(enrichmentSchema)),
    wiki: schema.maybe(schema.nullable(wikiSchema)),
  },
  {
    validate: validateDreamingConfig,
    meta: {
      description:
        'What the AI Index learns from its memories (facts, entities, and the relationships between them), and how dreaming improves its knowledge items and ties them into wiki pages.',
    },
  }
);

export const dreamingResponseSchema = () =>
  schema.object({
    dreaming: dreamingConfigSchema,
  });
