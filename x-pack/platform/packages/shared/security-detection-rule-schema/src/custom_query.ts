/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import type {
  BuilderTypeDefinition,
  BuilderTypeManifest,
  GeneratedQuery,
  QueryGenerationInput,
} from '@kbn/alerting-v2-rule-builders';

import {
  detectionRuleCommonFields,
  DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS,
} from './detection_rule_common_fields';
import { enrichDetectionRuleEvent } from './enrich_detection_rule_event';
import { buildQuotedIndexSource, buildFullTextFilter } from './esql_helpers';

// ---------------------------------------------------------------------------
// Schema
//
// The complete builder_fields shape for security.detection.query:
// the shared detection fragment spread in, plus three type-specific fields.
//
// Ref: rule-data-model.md "security.detection.query"
// ---------------------------------------------------------------------------

export const customQueryBuilderFieldsSchema = z
  .object({
    ...detectionRuleCommonFields,
    index: z.array(z.string().min(1).max(256)).min(1).max(32),
    query: z.string().min(1).max(8192),
    language: z.enum(['kuery', 'lucene']),
  })
  .strict();

export type CustomQueryBuilderFields = z.infer<typeof customQueryBuilderFieldsSchema>;

// ---------------------------------------------------------------------------
// Manifest (version 1)
//
// Declares typed sub-fields for the flattened builder_fields container.
// Spreads the shared fragment's sub-field mappings (risk_score, max_signals,
// note, setup) and adds `query` as `text` — the one sub-field specific to
// this type.
//
// Ref: rule-type-registration.md "The manifest shape"
//      rule-data-model.md "When a field gets a typed sub-field"
// ---------------------------------------------------------------------------

export const securityDetectionQueryManifest: BuilderTypeManifest = {
  type: 'security.detection.query',
  currentVersion: 1,
  versions: {
    1: {
      addedSubFieldMappings: {
        ...DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS,
        query: { type: 'text' },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Extra validation hook
//
// Rejects a `query` that is only whitespace. The schema ensures `query` is at
// least one character long, but an all-whitespace string passes that check and
// is useless as a query.
//
// Pure, no I/O, no registry access.
//
// Ref: rule-validation.md "The extra validation hook"
// ---------------------------------------------------------------------------

const validateCustomQueryFields = (fields: CustomQueryBuilderFields): string[] => {
  const errors: string[] = [];
  if (fields.query.trim() === '') {
    errors.push('query must not be blank (only whitespace)');
  }
  return errors;
};

// ---------------------------------------------------------------------------
// Compile function
//
// Builds a standalone breach query via the @elastic/esql AST builder.
// User-supplied values are always AST literals — never spliced into query
// source text.  Index names are emitted as quoted identifiers so that a
// user-supplied entry cannot inject extra pipeline commands.
//
// language: 'kuery'  => | WHERE KQL("...")
// language: 'lucene' => | WHERE QSTR("...", {"allow_wildcard": TRUE})
//   allow_wildcard is the one option v1 pins that QSTR defaults off.
//   The named-parameter map form is the only valid ES|QL syntax for QSTR
//   options; a binary = or : expression is rejected by Elasticsearch.
//
// max_signals maps to a trailing | LIMIT <n>. When absent, no LIMIT is
// emitted and the deployment-wide cap alone applies.
//
// Ref: rule-execution-logic.md "security.detection.query"
//      rule-execution-logic.md "AST composition is the required pattern"
// ---------------------------------------------------------------------------

const generateCustomQuery = ({
  fields,
}: QueryGenerationInput<CustomQueryBuilderFields>): GeneratedQuery => {
  const commands: ESQLAstCommand[] = [];

  // FROM "index1", "index2", ...
  // Index names are quoted so that user-supplied entries cannot inject extra
  // pipeline commands (e.g. "logs-* | LIMIT 1" would otherwise become two
  // commands).  buildQuotedIndexSource emits a quoted AST source node.
  commands.push(
    Builder.command({
      name: 'from',
      args: fields.index.map(buildQuotedIndexSource),
    })
  );

  // WHERE KQL("...") or WHERE QSTR("...", {"allow_wildcard": TRUE})
  // buildFullTextFilter handles both languages and uses the shared QSTR
  // named-parameter map so both detection types emit identical wraps.
  commands.push(
    Builder.command({ name: 'where', args: [buildFullTextFilter(fields.query, fields.language)] })
  );

  // LIMIT <max_signals> — omitted when the field is absent so the deployment
  // cap alone controls the row budget.
  if (fields.max_signals !== undefined) {
    commands.push(
      Builder.command({
        name: 'limit',
        args: [Builder.expression.literal.integer(fields.max_signals)],
      })
    );
  }

  const breachQuery = BasicPrettyPrinter.multiline(Builder.expression.query(commands), {
    pipeTab: '',
  });

  return {
    query: {
      format: 'standalone' as const,
      breach: { query: breachQuery },
    },
  };
};

// ---------------------------------------------------------------------------
// Full BuilderTypeDefinition
//
// Exported so the security_detections plugin can register this type with a
// single import in Phase 8.
//
// Ref: rule-type-registration.md "What a registration declares"
// ---------------------------------------------------------------------------

export const securityDetectionQuery: BuilderTypeDefinition<CustomQueryBuilderFields> = {
  type: 'security.detection.query',
  name: 'Custom Query',
  description: 'A detection rule that runs a KQL or Lucene query against specified data sources.',
  kind: 'signal',
  ownership: { solution: 'security', domain: 'detection' },
  compilation: 'execution_time',
  builderFieldsSchema: customQueryBuilderFieldsSchema,
  validateFields: validateCustomQueryFields,
  manifest: securityDetectionQueryManifest,
  generateQuery: generateCustomQuery,
  enrichRuleEvent: enrichDetectionRuleEvent,
};
