/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { MAX_CONNECTOR_SAMPLE_CALLS } from '../ontology';
import {
  existingOntologyKiSchema,
  ontologyCatalogEntrySchema,
  ontologyDatasetProfileSchema,
  ontologySourceStatusSchema,
  sourceIdSchema,
} from './catalog_ontology_sources';
import { aiIndexIdSchema } from './ki';

export const CATALOG_CONNECTOR_SOURCE_STEP_ID = 'context-engine.catalogConnectorSource' as const;
export const SAMPLE_CONNECTOR_SOURCE_STEP_ID = 'context-engine.sampleConnectorSource' as const;

export const connectorToolSchema = lazySchema(() =>
  z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.string().describe('The JSON schema of its params'),
  })
);

export const catalogConnectorSourceInputSchema = lazySchema(() =>
  z.object({ ai_index_id: aiIndexIdSchema, source_id: sourceIdSchema })
);

export const catalogConnectorSourceOutputSchema = lazySchema(() =>
  z.object({
    describe: z.boolean().describe('Whether to sample and describe the connector this run'),
    datasets: z
      .array(ontologyDatasetProfileSchema)
      .max(1)
      .describe('The dataset of the connector when it is described this run, else none'),
    connector: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        description: z.string(),
        skill: z.string().optional(),
      })
      .optional(),
    tools: z
      .array(connectorToolSchema)
      .describe('The read sub-actions of the connector an agent may call'),
    others: z
      .array(ontologyCatalogEntrySchema)
      .describe('The index datasets other sources described, with the fields they join on'),
    existing: z
      .array(existingOntologyKiSchema)
      .describe('The ontology KIs of the AI index visible in this space'),
    skipped: z.string().optional().describe('Why the connector is not described this run'),
    source: ontologySourceStatusSchema,
  })
);

export type CatalogConnectorSourceOutput = z.infer<typeof catalogConnectorSourceOutputSchema>;

export const sampleConnectorSourceInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    source_id: sourceIdSchema,
    calls: z
      .array(z.unknown())
      .max(MAX_CONNECTOR_SAMPLE_CALLS * 4)
      .default([])
      .describe(
        `The calls a model planned, each { sub_action, params } with params as JSON; at most ${MAX_CONNECTOR_SAMPLE_CALLS} run`
      ),
  })
);

export const sampleConnectorSourceOutputSchema = lazySchema(() =>
  z.object({
    samples: z
      .array(
        z.object({
          sub_action: z.string(),
          params: z.string(),
          ok: z.boolean(),
          error: z.string().optional(),
          sample: z
            .string()
            .optional()
            .describe('The result as JSON, cut short; only its shape when value samples are off'),
        })
      )
      .describe('Each call that ran, with its result or why it failed'),
    catalog: z
      .array(ontologyCatalogEntrySchema)
      .describe('The connector as a dataset, with the record fields its samples hold'),
    rejected: z
      .array(z.object({ call: z.string(), reason: z.string() }))
      .describe('Planned calls that did not run, each with why'),
  })
);

export type SampleConnectorSourceOutput = z.infer<typeof sampleConnectorSourceOutputSchema>;

export const catalogConnectorSourceStepCommonDefinition: CommonStepDefinition<
  typeof catalogConnectorSourceInputSchema,
  typeof catalogConnectorSourceOutputSchema
> = {
  id: CATALOG_CONNECTOR_SOURCE_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.catalogConnectorSource.label', {
    defaultMessage: 'Catalog a connector source',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.catalogConnectorSource.description',
    {
      defaultMessage: 'List what a connector source of an AI index can read.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: catalogConnectorSourceInputSchema,
  outputSchema: catalogConnectorSourceOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.catalogConnectorSource.documentation.details',
      {
        defaultMessage:
          'Reads the connector of a connector source of the AI index as the workflow user and ' +
          'lists its read sub-actions that agents may call and that are enabled on it, with ' +
          'their params. It is described when it has no dataset KI yet, its read sub-actions ' +
          'changed, or its description is older than the refresh interval. Nothing is called ' +
          'on the connector, and nothing is written.',
      }
    ),
  },
};

export const sampleConnectorSourceStepCommonDefinition: CommonStepDefinition<
  typeof sampleConnectorSourceInputSchema,
  typeof sampleConnectorSourceOutputSchema
> = {
  id: SAMPLE_CONNECTOR_SOURCE_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.sampleConnectorSource.label', {
    defaultMessage: 'Sample a connector source',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.sampleConnectorSource.description',
    {
      defaultMessage: 'Read sample records from a connector source of an AI index.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: sampleConnectorSourceInputSchema,
  outputSchema: sampleConnectorSourceOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.sampleConnectorSource.documentation.details',
      {
        defaultMessage:
          'Runs up to {maxCalls} planned calls of read sub-actions of the connector, as the ' +
          'workflow user, after checking each is a read sub-action agents may call and its params ' +
          'are valid. Returns each result, cut short, and the record fields the results hold, ' +
          'with the values seen in each unless their names look sensitive or value samples are ' +
          'off. Write and destroy sub-actions are never called.',
        values: { maxCalls: MAX_CONNECTOR_SAMPLE_CALLS },
      }
    ),
  },
};
