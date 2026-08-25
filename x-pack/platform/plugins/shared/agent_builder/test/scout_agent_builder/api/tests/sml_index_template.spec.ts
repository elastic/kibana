/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  smlIndexName,
  smlMappingsComponentTemplateName,
  smlStorageSettings,
} from '@kbn/agent-builder-sml-plugin/server';
import { apiTest } from '../fixtures';

/** Base mappings every AI index gets, shipped by Elasticsearch's stack templates. */
const AI_INDEX_BASE_MAPPINGS_COMPONENT = 'ai-index@mappings';
/** The real, globally-shared user customization slot. Referenced read-only; never mutated. */
const AI_INDEX_CUSTOM_COMPONENT = 'ai-index@custom';

/**
 * A throwaway component that stands in for the shared `ai-index@custom` slot in
 * the composition simulations below. Using it keeps these tests from writing to
 * or deleting the real, globally-shared user slot — which every `ai-index-idx-*`
 * index composes — so they cannot erase real configuration or race another suite.
 */
const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const TEST_USER_COMPONENT = `test-sml-user-slot-${uniqueSuffix}@mappings`;
/** Never created — stands in for an optional slot that is referenced but absent. */
const MISSING_USER_COMPONENT = `test-sml-missing-slot-${uniqueSuffix}@mappings`;
const USER_FIELD = 'my_custom_label';

const putTestUserComponent = async (
  esClient: Client,
  properties: Record<string, MappingProperty>
) => {
  await esClient.cluster.putComponentTemplate({
    name: TEST_USER_COMPONENT,
    template: { mappings: { properties } },
  });
};

/**
 * Resolve the mappings Elasticsearch would apply to an SML backing index. Composes
 * the real base component and the real component Kibana installed for SML, with the
 * shared user slot swapped for a per-run test component — the composition order
 * (base → user slot → SML) and the `ignore_missing_component_templates` tolerance
 * match production, so precedence is tested faithfully without touching the global
 * `ai-index@custom`. Pass an uncreated `userComponent` to exercise the missing slot.
 */
const resolveSmlMappings = async (
  esClient: Client,
  { userComponent = TEST_USER_COMPONENT }: { userComponent?: string } = {}
) => {
  const { template } = await esClient.indices.simulateTemplate({
    index_patterns: [`${smlIndexName}-*`],
    priority: smlStorageSettings.priority,
    composed_of: [AI_INDEX_BASE_MAPPINGS_COMPONENT, userComponent, smlMappingsComponentTemplateName],
    ignore_missing_component_templates: [userComponent],
  });
  return (template.mappings?.properties ?? {}) as Record<string, MappingProperty>;
};

/**
 * `ai-index@custom` is the one customization slot Elasticsearch reserves for
 * users, and it applies to every `ai-index-idx-*` index. These tests pin the
 * property that matters: a user populating that slot composes cleanly with the
 * component Kibana installs for the SML index, and cannot break it.
 */
apiTest.describe(
  'Agent Builder — SML index template composition',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await putTestUserComponent(esClient, { [USER_FIELD]: { type: 'keyword' } });
    });

    apiTest.afterAll(async ({ esClient }) => {
      // Ignore a missing component, but let auth/transport failures surface.
      await esClient.cluster.deleteComponentTemplate(
        { name: TEST_USER_COMPONENT },
        { ignore: [404] }
      );
    });

    apiTest('Kibana installs the SML mappings component template', async ({ esClient }) => {
      const { component_templates: componentTemplates } =
        await esClient.cluster.getComponentTemplate({
          name: smlMappingsComponentTemplateName,
        });

      expect(componentTemplates).toHaveLength(1);
      const { component_template: componentTemplate } = componentTemplates[0];
      expect(componentTemplate._meta).toMatchObject({
        managed: true,
        managed_by: 'agentBuilderSml',
      });

      const properties = componentTemplate.template.mappings?.properties ?? {};
      // SML's own fields, absent from the base `ai-index@mappings`.
      expect(Object.keys(properties)).toStrictEqual(
        expect.arrayContaining(['spaces', 'permissions', 'ingestion_method', 'origin', 'id'])
      );
      // Base-provided fields are composed in, not redeclared here.
      expect(Object.keys(properties)).not.toContain('title');
      expect(Object.keys(properties)).not.toContain('content');
    });

    apiTest('does not claim the shared user customization slot', () => {
      // Read-only: assert against the production name and settings without ever
      // writing to or deleting the shared `ai-index@custom` component.
      expect(smlMappingsComponentTemplateName).not.toBe(AI_INDEX_CUSTOM_COMPONENT);
      expect(smlStorageSettings.composedOf).toContain(AI_INDEX_CUSTOM_COMPONENT);
      // Only the user slot may be missing; SML's own component must exist.
      expect(smlStorageSettings.ignoreMissingComponentTemplates).toStrictEqual([
        AI_INDEX_CUSTOM_COMPONENT,
      ]);
    });

    apiTest('resolves base mappings, the user slot and SML together', async ({ esClient }) => {
      const properties = await resolveSmlMappings(esClient);

      // From `ai-index@mappings` (Elasticsearch).
      expect(properties.title).toMatchObject({
        type: 'text',
        fields: { semantic: { type: 'semantic_text' } },
      });
      // From the user's customization slot.
      expect(properties[USER_FIELD]).toMatchObject({ type: 'keyword' });
      // From Kibana's SML component.
      expect(properties.spaces).toMatchObject({ type: 'keyword' });
      expect(properties.permissions).toBeDefined();
    });

    apiTest('applies SML overrides on top of the base mappings', async ({ esClient }) => {
      const properties = await resolveSmlMappings(esClient);

      // The base maps `tags` and `type` as plain keywords; SML needs the lowercase
      // normalizer on both and is composed after the base, so its override wins.
      expect(properties.tags).toMatchObject({ type: 'keyword', normalizer: 'lowercase' });
      expect(properties.type).toMatchObject({ type: 'keyword', normalizer: 'lowercase' });
    });

    apiTest('keeps SML fields intact when a user component conflicts', async ({ esClient }) => {
      // A user redefining an SML field must not win: SML's component is composed
      // after the user slot precisely so the @ menu and RBAC filters survive.
      await putTestUserComponent(esClient, {
        [USER_FIELD]: { type: 'keyword' },
        spaces: { type: 'text' },
      });

      const properties = await resolveSmlMappings(esClient);

      expect(properties.spaces).toMatchObject({ type: 'keyword' });
      // The user's own, non-conflicting field still lands.
      expect(properties[USER_FIELD]).toMatchObject({ type: 'keyword' });
    });

    apiTest('tolerates a referenced optional component that was never created', async ({
      esClient,
    }) => {
      // Mirror production: the optional slot stays referenced in `composed_of` and
      // is tolerated through `ignore_missing_component_templates` — not dropped from
      // the list — so resolution still succeeds and the base + SML fields land.
      const properties = await resolveSmlMappings(esClient, {
        userComponent: MISSING_USER_COMPONENT,
      });

      expect(properties.title).toBeDefined();
      expect(properties.spaces).toMatchObject({ type: 'keyword' });
      expect(properties[USER_FIELD]).toBeUndefined();
    });
  }
);
