/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '../definitions/entity_schema';
import { getEuidDslDocumentsContainsIdFilter, getEuidDslFilterBasedOnDocument } from './dsl';
import {
  getEuidEsqlDocumentsContainsIdFilter,
  getEuidEsqlEvaluation,
  getEuidEsqlFilterBasedOnDocument,
} from './esql';
import { getEuidKqlFilterBasedOnDocument } from './kql';
import { getEntityIdentifiersFromDocument, getEuidFromObject } from './memory';
import { getEuidPainlessEvaluation, getEuidPainlessRuntimeMapping } from './painless';

/** The id compiler reads only the identity core, so a definition without `extraction` compiles. */

const managedBy = { kind: 'plugin', id: 'testPlugin' } as const;

const singleFieldDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.pod',
  name: 'Kubernetes pod',
  identityField: { singleField: 'kubernetes.pod.uid' },
  managedBy,
};

const rankedDefinition: EntityDefinitionWithoutId = {
  type: 'k8s.pod',
  name: 'Kubernetes pod',
  identityField: {
    euidRanking: {
      branches: [
        { ranking: [[{ field: 'kubernetes.pod.uid' }], [{ field: 'kubernetes.pod.name' }]] },
      ],
    },
    documentsFilter: {
      or: [
        { field: 'kubernetes.pod.uid', exists: true },
        { field: 'kubernetes.pod.name', exists: true },
      ],
    },
  },
  managedBy,
};

const fullDoc = { kubernetes: { pod: { uid: 'pod-1', name: 'web' } } };
const nameOnlyDoc = { kubernetes: { pod: { name: 'web' } } };

describe('id compiler on a core-only definition', () => {
  describe('single-field identity', () => {
    const definition = singleFieldDefinition;

    it('has no extraction block', () => {
      expect(definition.extraction).toBeUndefined();
    });

    it('compiles ES|QL', () => {
      expect(getEuidEsqlEvaluation(definition, 'entity.id')).toBe(
        'entity.id = CONCAT("k8s.pod:", TO_STRING(kubernetes.pod.uid))'
      );
      expect(getEuidEsqlDocumentsContainsIdFilter(definition)).toBe(
        '(TO_STRING(kubernetes.pod.uid) IS NOT NULL AND TO_STRING(kubernetes.pod.uid) != "")'
      );
      expect(getEuidEsqlFilterBasedOnDocument(definition, fullDoc)).toBe(
        '(kubernetes.pod.uid == "pod-1")'
      );
    });

    it('compiles DSL', () => {
      expect(getEuidDslFilterBasedOnDocument(definition, fullDoc)).toEqual({
        bool: { filter: [{ term: { 'kubernetes.pod.uid': 'pod-1' } }] },
      });
      expect(getEuidDslDocumentsContainsIdFilter(definition)).toEqual({
        bool: {
          must: [
            { exists: { field: 'kubernetes.pod.uid' } },
            { bool: { must_not: { match: { 'kubernetes.pod.uid': '' } } } },
          ],
        },
      });
    });

    it('compiles KQL', () => {
      expect(getEuidKqlFilterBasedOnDocument(definition, fullDoc)).toBe(
        'kubernetes.pod.uid: "pod-1"'
      );
    });

    it('compiles Painless', () => {
      expect(getEuidPainlessEvaluation(definition)).toMatchSnapshot();
      const mapping = getEuidPainlessRuntimeMapping(definition);
      expect(mapping.type).toBe('keyword');
      expect(mapping.script.source).toContain('emit(___euid)');
    });

    it('computes the euid in memory', () => {
      expect(getEuidFromObject(definition, fullDoc)).toBe('k8s.pod:pod-1');
      expect(getEuidFromObject(definition, nameOnlyDoc)).toBeUndefined();
      expect(getEntityIdentifiersFromDocument(definition, fullDoc)).toEqual({
        'kubernetes.pod.uid': 'pod-1',
      });
    });
  });

  describe('two-field ranking', () => {
    const definition = rankedDefinition;

    it('has no extraction block', () => {
      expect(definition.extraction).toBeUndefined();
    });

    it('compiles ES|QL', () => {
      expect(getEuidEsqlEvaluation(definition, 'entity.id')).toMatchSnapshot();
      expect(getEuidEsqlDocumentsContainsIdFilter(definition)).toBe(
        'TO_STRING(kubernetes.pod.uid) IS NOT NULL OR TO_STRING(kubernetes.pod.name) IS NOT NULL'
      );
      expect(getEuidEsqlFilterBasedOnDocument(definition, fullDoc)).toBe(
        '((kubernetes.pod.uid == "pod-1"))'
      );
    });

    it('compiles DSL', () => {
      expect(getEuidDslFilterBasedOnDocument(definition, fullDoc)).toEqual({
        bool: { filter: [{ term: { 'kubernetes.pod.uid': 'pod-1' } }] },
      });
      expect(getEuidDslDocumentsContainsIdFilter(definition)).toEqual({
        bool: {
          should: [
            { exists: { field: 'kubernetes.pod.uid' } },
            { exists: { field: 'kubernetes.pod.name' } },
          ],
        },
      });
    });

    it('compiles KQL', () => {
      expect(getEuidKqlFilterBasedOnDocument(definition, fullDoc)).toBe(
        'kubernetes.pod.uid: "pod-1"'
      );
      expect(getEuidKqlFilterBasedOnDocument(definition, nameOnlyDoc)).toBe(
        'kubernetes.pod.name: "web" AND (NOT kubernetes.pod.uid: * OR kubernetes.pod.uid: "")'
      );
    });

    it('compiles Painless', () => {
      expect(getEuidPainlessEvaluation(definition)).toMatchSnapshot();
      expect(getEuidPainlessRuntimeMapping(definition).script.source).toContain(
        'return "k8s.pod:" + doc[\'kubernetes.pod.name\'].value;'
      );
    });

    it('computes the euid in memory', () => {
      expect(getEuidFromObject(definition, fullDoc)).toBe('k8s.pod:pod-1');
      expect(getEuidFromObject(definition, nameOnlyDoc)).toBe('k8s.pod:web');
      expect(getEuidFromObject(definition, {})).toBeUndefined();
      expect(getEntityIdentifiersFromDocument(definition, fullDoc)).toEqual({
        'kubernetes.pod.uid': 'pod-1',
      });
    });
  });
});
