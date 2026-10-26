/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Backward-compatibility snapshots for the four built-in Security definitions.
 *
 * Every EUID backend (ES|QL, DSL, KQL, Painless, in-memory) is snapshotted for every built-in
 * type against a fixed set of sample documents. These snapshots must not change when the
 * definition schema is refactored: the Security Solution relies on byte-identical output for
 * alert enrichment, risk scoring and entity resolution.
 */

import { ALL_ENTITY_TYPES } from '../definitions/entity_schema';
import type { EntityType } from '../definitions/entity_schema';
import { getBuiltInEntityDefinition } from '../definitions/registry';
import {
  getEuidDslDocumentsContainsIdFilter,
  getEuidDslFilterBasedOnDocument,
  getEuidDslFilterBasedOnEntityRecord,
} from './dsl';
import {
  getEuidEsqlDocumentsContainsIdFilter,
  getEuidEsqlEvaluation,
  getEuidEsqlFilterBasedOnDocument,
  getFieldEvaluationsEsql,
  getHostScopedUserEuidEsql,
} from './esql';
import { getIdentityFieldEvaluations } from './field_evaluations';
import { getEuidKqlFilterBasedOnDocument } from './kql';
import {
  getEntityIdentifiersFromDocument,
  getEuidFromObject,
  getEuidFromObjectForSearch,
} from './memory';
import { getEuidFromTimelineNonEcsData, type NonEcsTimelineDataRow } from './non_ecs_timeline_data';
import {
  getEuidPainlessEvaluation,
  getEuidPainlessEvaluationForSearch,
  getEuidPainlessRuntimeMapping,
} from './painless';
import {
  getEuidNamespaceSourceFields,
  getEuidNamespaceSourcePrefix,
  getEuidSourceFields,
} from './identity_fields';

interface SampleDocument {
  label: string;
  doc: Record<string, unknown>;
}

const SAMPLE_DOCUMENTS: Record<EntityType, SampleDocument[]> = {
  host: [
    { label: 'host.id and host.name', doc: { host: { id: 'host-id-1', name: 'server-1' } } },
    { label: 'host.name only', doc: { host: { name: 'server-1' } } },
    { label: 'host.hostname only', doc: { host: { hostname: 'server-1.example.com' } } },
    { label: 'no identity', doc: { message: 'nothing to see here' } },
  ],
  user: [
    {
      label: 'local user (user.name + host.id)',
      doc: {
        user: { name: 'alice' },
        host: { id: 'host-id-1', name: 'server-1' },
        event: { module: 'system' },
      },
    },
    {
      label: 'okta user by email',
      doc: {
        user: { email: 'alice@example.com', name: 'alice' },
        event: { module: 'okta', kind: 'asset' },
      },
    },
    {
      label: 'asset discovery aws user by id',
      doc: {
        user: { id: 'aws-user-1' },
        cloud: { provider: 'aws' },
        event: { module: 'asset_discovery', kind: 'asset' },
      },
    },
    {
      label: 'dataset chunk source (entra)',
      doc: {
        user: { name: 'bob', domain: 'example.com' },
        data_stream: { dataset: 'entityanalytics_entra_id.user' },
        event: { kind: 'asset' },
      },
    },
    {
      label: 'fails post agg gate (no asset kind, not local)',
      doc: { user: { name: 'bob' }, event: { module: 'system', kind: 'event' } },
    },
    {
      // Exercises the namespace field evaluation's fallback value (no event.module, no dataset).
      label: 'no namespace source (namespace fallback)',
      doc: { user: { name: 'carol' } },
    },
  ],
  service: [
    { label: 'service.name', doc: { service: { name: 'checkout-api' } } },
    { label: 'no identity', doc: { message: 'nothing to see here' } },
  ],
  generic: [
    { label: 'entity.id', doc: { entity: { id: 'arn:aws:iam::123456789012:user/alice' } } },
    { label: 'no identity', doc: { message: 'nothing to see here' } },
  ],
};

const ENTITY_RECORDS: Record<EntityType, Record<string, unknown>> = {
  host: { host: { id: ['host-id-1'], name: ['server-1'] }, entity: { id: 'host:host-id-1' } },
  user: {
    user: { email: ['alice@example.com'], name: 'alice' },
    entity: { id: 'user:alice@example.com@okta', namespace: 'okta' },
  },
  service: { service: { name: ['checkout-api'] }, entity: { id: 'service:checkout-api' } },
  generic: { entity: { id: 'arn:aws:iam::123456789012:user/alice' } },
};

/** Observed raw values fed to the namespace source prefix helper for every candidate field. */
const NAMESPACE_SOURCE_OBSERVED_VALUES = [
  'okta.system',
  'okta_legacy.system',
  'entityanalytics_entra_id.user',
  'system',
] as const;

/** Flattens a nested sample document into the Timeline non-ECS row shape (field + value[]). */
const toTimelineNonEcsRows = (doc: Record<string, unknown>, prefix = ''): NonEcsTimelineDataRow[] =>
  Object.entries(doc).flatMap(([key, value]) => {
    const field = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return toTimelineNonEcsRows(value as Record<string, unknown>, field);
    }
    return [{ field, value: [String(value)] }];
  });

describe('built-in definitions EUID compiler output (backward compatibility)', () => {
  it('ES|QL: host-scoped user EUID (experimental, definition-independent)', () => {
    expect(getHostScopedUserEuidEsql()).toMatchSnapshot();
  });

  describe.each(ALL_ENTITY_TYPES)('%s', (type) => {
    const definition = getBuiltInEntityDefinition(type);

    it('ES|QL: typed entity id evaluation', () => {
      expect(getEuidEsqlEvaluation(definition, 'entity.id')).toMatchSnapshot();
    });

    it('ES|QL: untyped id evaluation (extraction shape)', () => {
      expect(
        getEuidEsqlEvaluation(definition, 'recent.entity.EngineMetadata.UntypedId', {
          withTypeId: false,
        })
      ).toMatchSnapshot();
    });

    it('ES|QL: documents contain id filter', () => {
      expect(getEuidEsqlDocumentsContainsIdFilter(definition)).toMatchSnapshot();
    });

    it('ES|QL: shared field evaluations', () => {
      expect(getFieldEvaluationsEsql(definition)).toMatchSnapshot();
    });

    it('identity field evaluations', () => {
      expect(getIdentityFieldEvaluations(definition)).toMatchSnapshot();
    });

    it('DSL: documents contain id filter', () => {
      expect(getEuidDslDocumentsContainsIdFilter(definition)).toMatchSnapshot();
    });

    it('DSL: filter based on entity record', () => {
      expect(
        getEuidDslFilterBasedOnEntityRecord(definition, ENTITY_RECORDS[type])
      ).toMatchSnapshot();
    });

    it('Painless: evaluation, search evaluation and runtime mapping', () => {
      expect(getEuidPainlessEvaluation(definition)).toMatchSnapshot();
      expect(getEuidPainlessEvaluationForSearch(definition)).toMatchSnapshot();
      expect(getEuidPainlessRuntimeMapping(definition)).toMatchSnapshot();
    });

    it('identity source fields', () => {
      expect(getEuidSourceFields(definition)).toMatchSnapshot();
      expect(getEuidNamespaceSourceFields(definition)).toMatchSnapshot();
    });

    it('namespace source prefix', () => {
      const { exactMatchFields, prefixMatchFields } = getEuidNamespaceSourceFields(definition);
      const candidateFields = [...prefixMatchFields, ...exactMatchFields, 'message'];
      expect(
        candidateFields.map((field) => ({
          field,
          prefixes: NAMESPACE_SOURCE_OBSERVED_VALUES.map((observedValue) => ({
            observedValue,
            prefix: getEuidNamespaceSourcePrefix(definition, field, observedValue),
          })),
        }))
      ).toMatchSnapshot();
    });

    describe.each(SAMPLE_DOCUMENTS[type])('document: $label', ({ doc }) => {
      it('in-memory: euid, search euid and identifiers', () => {
        expect(getEuidFromObject(definition, doc)).toMatchSnapshot();
        expect(getEuidFromObjectForSearch(definition, doc)).toMatchSnapshot();
        expect(getEntityIdentifiersFromDocument(definition, doc)).toMatchSnapshot();
      });

      it('in-memory: euid from timeline non-ECS rows', () => {
        expect(
          getEuidFromTimelineNonEcsData(definition, toTimelineNonEcsRows(doc))
        ).toMatchSnapshot();
      });

      it('ES|QL: filter based on document', () => {
        expect(getEuidEsqlFilterBasedOnDocument(definition, doc)).toMatchSnapshot();
      });

      it('DSL: filter based on document', () => {
        expect(getEuidDslFilterBasedOnDocument(definition, doc)).toMatchSnapshot();
        expect(
          getEuidDslFilterBasedOnDocument(definition, doc, { excludeHigherRankedFields: false })
        ).toMatchSnapshot();
      });

      it('KQL: filter based on document', () => {
        expect(getEuidKqlFilterBasedOnDocument(definition, doc)).toMatchSnapshot();
      });
    });
  });
});
