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

const USER_CUSTOM_COMPONENT = 'ai-index@custom';
const USER_FIELD = 'my_custom_label';

const putUserCustomComponent = async (
  esClient: Client,
  properties: Record<string, MappingProperty>
) => {
  await esClient.cluster.putComponentTemplate({
    name: USER_CUSTOM_COMPONENT,
    template: { mappings: { properties } },
  });
};

/** Resolve the mappings Elasticsearch would apply to an SML backing index. */
const resolveSmlMappings = async (esClient: Client) => {
  const { template } = await esClient.indices.simulateTemplate({
    index_patterns: [`${smlIndexName}-*`],
    priority: smlStorageSettings.priority,
    composed_of: smlStorageSettings.composedOf,
    ignore_missing_component_templates: smlStorageSettings.ignoreMissingComponentTemplates,
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
      await putUserCustomComponent(esClient, { [USER_FIELD]: { type: 'keyword' } });
    });

    apiTest.afterAll(async ({ esClient }) => {
      try {
        await esClient.cluster.deleteComponentTemplate({ name: USER_CUSTOM_COMPONENT });
      } catch {
        // ignore — already cleaned up
      }
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

    apiTest('does not claim the shared user customization slot', async ({ esClient }) => {
      expect(smlMappingsComponentTemplateName).not.toBe(USER_CUSTOM_COMPONENT);
      expect(smlStorageSettings.composedOf).toContain(USER_CUSTOM_COMPONENT);
      // Only the user slot may be missing; SML's own component must exist.
      expect(smlStorageSettings.ignoreMissingComponentTemplates).toStrictEqual([
        USER_CUSTOM_COMPONENT,
      ]);

      // The slot still belongs to the user: Kibana installed its own component
      // under a different name and left this one as the test wrote it.
      const { component_templates: userComponents } = await esClient.cluster.getComponentTemplate({
        name: USER_CUSTOM_COMPONENT,
      });
      const userProperties =
        userComponents[0].component_template.template.mappings?.properties ?? {};
      expect(Object.keys(userProperties)).toStrictEqual([USER_FIELD]);
    });

    apiTest('resolves base mappings, the user slot and SML together', async ({ esClient }) => {
      const properties = await resolveSmlMappings(esClient);

      // From `ai-index@mappings` (Elasticsearch).
      expect(properties.title).toMatchObject({
        type: 'text',
        fields: { semantic: { type: 'semantic_text' } },
      });
      // From the user's `ai-index@custom`.
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
      // after `ai-index@custom` precisely so the @ menu and RBAC filters survive.
      await putUserCustomComponent(esClient, {
        [USER_FIELD]: { type: 'keyword' },
        spaces: { type: 'text' },
      });

      const properties = await resolveSmlMappings(esClient);

      expect(properties.spaces).toMatchObject({ type: 'keyword' });
      // The user's own, non-conflicting field still lands.
      expect(properties[USER_FIELD]).toMatchObject({ type: 'keyword' });
    });

    apiTest('resolves without the optional user slot present', async ({ esClient }) => {
      await esClient.cluster.deleteComponentTemplate({ name: USER_CUSTOM_COMPONENT });

      const properties = await resolveSmlMappings(esClient);

      expect(properties.title).toBeDefined();
      expect(properties.spaces).toMatchObject({ type: 'keyword' });
      expect(properties[USER_FIELD]).toBeUndefined();
    });
  }
);
