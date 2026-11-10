/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  HousekeepingContext,
  HousekeepingReference,
  HousekeepingResourceEntry,
  HousekeepingResourceProvider,
} from '@kbn/housekeeping-plugin/server';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';

const DEFAULT_PIPELINE = 'index.default_pipeline';
const FINAL_PIPELINE = 'index.final_pipeline';
const LIFECYCLE_NAME = 'index.lifecycle.name';
const SETTINGS = [DEFAULT_PIPELINE, FINAL_PIPELINE, LIFECYCLE_NAME];
const NO_PIPELINE = '_none';

const PIPELINE_IMPACT = i18n.translate('xpack.idxMgmt.housekeeping.missingPipelineImpact', {
  defaultMessage:
    'Elasticsearch rejects the documents sent here until the pipeline exists or the setting changes.',
});
const POLICY_IMPACT = i18n.translate('xpack.idxMgmt.housekeeping.missingPolicyImpact', {
  defaultMessage:
    'ILM does not manage these indices, so they are never rolled over or deleted and keep growing.',
});
const COMPONENT_TEMPLATE_IMPACT = i18n.translate(
  'xpack.idxMgmt.housekeeping.missingComponentTemplateImpact',
  {
    defaultMessage:
      'New indices from this template miss the settings and mappings of the component template.',
  }
);

type Settings = Record<string, unknown> | undefined;

const settingReferences = (settings: Settings, names = SETTINGS): HousekeepingReference[] =>
  names.flatMap((setting): HousekeepingReference[] => {
    const value = settings?.[setting];
    if (typeof value !== 'string' || value === '' || value === NO_PIPELINE) {
      return [];
    }
    return setting === LIFECYCLE_NAME
      ? [{ targetType: 'ilm_policy', targetId: value, via: setting, impact: POLICY_IMPACT }]
      : [{ targetType: 'ingest_pipeline', targetId: value, via: setting, impact: PIPELINE_IMPACT }];
  });

const uniqueReferences = (references: HousekeepingReference[]) => [
  ...new Map(
    references.map((reference) => [`${reference.via}|${reference.targetId}`, reference])
  ).values(),
];

export const isManagedMeta = (meta?: Record<string, unknown>) => meta?.managed === true;

/** Names and patterns that start with a dot belong to Elasticsearch, Kibana or other system users. */
const isSystemTemplate = (name: string, patterns: string[] = []) =>
  name.startsWith('.') ||
  (patterns.length > 0 && patterns.every((pattern) => pattern.startsWith('.')));

const toPatternRegExp = (pattern: string) =>
  new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

/** The composable template that Elasticsearch would apply to an index created with this name. */
const createTemplateMatcher = (
  templates: Array<{ name: string; patterns: string[]; priority: number }>
) => {
  const compiled = templates
    .map(({ name, patterns, priority }) => ({
      name,
      priority,
      regExps: patterns.map(toPatternRegExp),
    }))
    .sort((a, b) => b.priority - a.priority);
  return (index: string) =>
    compiled.find(({ regExps }) => regExps.some((regExp) => regExp.test(index)))?.name;
};

export const indexResourceProvider: HousekeepingResourceProvider = {
  id: 'index_management',
  title: i18n.translate('xpack.idxMgmt.housekeeping.providerTitle', {
    defaultMessage: 'Index Management',
  }),
  resourceTypes: [
    {
      id: 'index_template',
      label: i18n.translate('xpack.idxMgmt.housekeeping.indexTemplateLabel', {
        defaultMessage: 'Index template',
      }),
      locator: {
        id: INDEX_MANAGEMENT_LOCATOR_ID,
        getParams: (name) => ({ page: 'index_template', indexTemplate: name }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.indices.getIndexTemplate({ name }, { signal: abortSignal }))
          .index_templates[0]?.index_template,
      unused: {
        message: i18n.translate('xpack.idxMgmt.housekeeping.unusedIndexTemplateMessage', {
          defaultMessage:
            'No data stream or index matches these templates today. If nothing will be created from them, delete them.',
        }),
        getFix: (name) => ({
          description: i18n.translate('xpack.idxMgmt.housekeeping.deleteUnusedIndexTemplateFix', {
            defaultMessage:
              'Deletes the index template. Existing indices and data streams keep their settings and mappings.',
          }),
          request: `DELETE _index_template/${name}`,
        }),
      },
    },
    {
      id: 'component_template',
      label: i18n.translate('xpack.idxMgmt.housekeeping.componentTemplateLabel', {
        defaultMessage: 'Component template',
      }),
      locator: {
        id: INDEX_MANAGEMENT_LOCATOR_ID,
        getParams: (name) => ({ page: 'component_template', componentTemplate: name }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.cluster.getComponentTemplate({ name }, { signal: abortSignal }))
          .component_templates[0]?.component_template,
      unused: {
        message: i18n.translate('xpack.idxMgmt.housekeeping.unusedComponentTemplateMessage', {
          defaultMessage: 'No index template is composed of this component template.',
        }),
        getFix: (name) => ({
          description: i18n.translate(
            'xpack.idxMgmt.housekeeping.deleteUnusedComponentTemplateFix',
            {
              defaultMessage:
                'Deletes the component template. No index template is composed of it.',
            }
          ),
          request: `DELETE _component_template/${name}`,
        }),
      },
    },
    {
      id: 'data_stream',
      label: i18n.translate('xpack.idxMgmt.housekeeping.dataStreamLabel', {
        defaultMessage: 'Data stream',
      }),
      locator: {
        id: INDEX_MANAGEMENT_LOCATOR_ID,
        getParams: (name) => ({ page: 'data_streams_details', dataStreamName: name }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.indices.getDataStream({ name }, { signal: abortSignal })).data_streams[0],
    },
    {
      id: 'index',
      label: i18n.translate('xpack.idxMgmt.housekeeping.indexLabel', {
        defaultMessage: 'Index',
      }),
      locator: {
        id: INDEX_MANAGEMENT_LOCATOR_ID,
        getParams: (name) => ({ page: 'index_details', indexName: name }),
      },
      // Mappings can be huge, and the findings are about settings and aliases.
      describe: async (name, { esClient, abortSignal }) =>
        (
          await esClient.indices.get(
            { index: name, features: ['settings', 'aliases'] },
            { signal: abortSignal }
          )
        )[name],
    },
  ],
  referencedTypes: ['ingest_pipeline', 'ilm_policy', 'component_template', 'index_template'],

  async listResources({ esClient, abortSignal, fetchOnce }) {
    const [indexTemplates, componentTemplates, dataStreams, indexSettings] = await Promise.all([
      fetchOnce('index_templates', (signal) =>
        esClient.indices.getIndexTemplate({ flat_settings: true }, { signal })
      ),
      fetchOnce('component_templates', (signal) =>
        esClient.cluster.getComponentTemplate({ flat_settings: true }, { signal })
      ),
      fetchOnce('data_streams', (signal) =>
        esClient.indices.getDataStream({ name: '*', expand_wildcards: 'all' }, { signal })
      ),
      esClient.indices.getSettings(
        { index: '*', name: SETTINGS, flat_settings: true, expand_wildcards: ['open', 'hidden'] },
        { signal: abortSignal }
      ),
    ]);

    const resources: HousekeepingResourceEntry[] = [];
    // Templates for data streams only apply to data streams, which name their template already.
    const matchTemplate = createTemplateMatcher(
      indexTemplates.index_templates
        .filter(({ index_template: template }) => !template.data_stream)
        .map(({ name, index_template: template }) => ({
          name,
          patterns: [template.index_patterns].flat(),
          priority: template.priority ?? 0,
        }))
    );
    const templateReference = (template: string, via: string): HousekeepingReference => ({
      targetType: 'index_template',
      targetId: template,
      via,
      optional: true,
    });

    for (const { name, index_template: template } of indexTemplates.index_templates) {
      const optional = new Set([template.ignore_missing_component_templates ?? []].flat());
      resources.push({
        type: 'index_template',
        id: name,
        isManaged:
          isManagedMeta(template._meta) || isSystemTemplate(name, [template.index_patterns].flat()),
        references: [
          ...settingReferences(template.template?.settings as Settings),
          ...(template.composed_of ?? []).map(
            (componentTemplate): HousekeepingReference => ({
              targetType: 'component_template',
              targetId: componentTemplate,
              via: 'composed_of',
              impact: COMPONENT_TEMPLATE_IMPACT,
              optional: optional.has(componentTemplate),
            })
          ),
        ],
      });
    }

    for (const { name, component_template: template } of componentTemplates.component_templates) {
      resources.push({
        type: 'component_template',
        id: name,
        isManaged: isManagedMeta(template._meta) || isSystemTemplate(name),
        references: settingReferences(template.template?.settings as Settings),
      });
    }

    const backingIndices = new Set<string>();
    for (const dataStream of dataStreams.data_streams) {
      const indices = dataStream.indices.map(({ index_name: indexName }) => indexName);
      indices.forEach((index) => backingIndices.add(index));
      const writeIndex = indices[indices.length - 1];

      resources.push({
        type: 'data_stream',
        id: dataStream.name,
        isManaged: isManagedMeta(dataStream._meta) || dataStream.system === true,
        // Only the write index receives documents, but ILM manages every backing index.
        references: uniqueReferences([
          ...settingReferences(indexSettings[writeIndex]?.settings as Settings, [
            DEFAULT_PIPELINE,
            FINAL_PIPELINE,
          ]),
          ...indices.flatMap((index) =>
            settingReferences(indexSettings[index]?.settings as Settings, [LIFECYCLE_NAME])
          ),
          templateReference(dataStream.template, 'data_stream.template'),
        ]),
        evidence: { backingIndices: indices.length },
      });
    }

    for (const [index, { settings }] of Object.entries(indexSettings)) {
      if (backingIndices.has(index)) {
        continue;
      }
      resources.push({
        type: 'index',
        id: index,
        isManaged: index.startsWith('.'),
        references: [
          ...settingReferences(settings as Settings),
          ...[matchTemplate(index)].flatMap((template) =>
            template ? [templateReference(template, 'index_patterns')] : []
          ),
        ],
      });
    }

    return resources;
  },
};

export const enrichPolicyProvider: HousekeepingResourceProvider = {
  id: 'index_management_enrich',
  title: i18n.translate('xpack.idxMgmt.housekeeping.enrichProviderTitle', {
    defaultMessage: 'Enrich policies',
  }),
  resourceTypes: [
    {
      id: 'enrich_policy',
      label: i18n.translate('xpack.idxMgmt.housekeeping.enrichPolicyLabel', {
        defaultMessage: 'Enrich policy',
      }),
      locator: {
        id: INDEX_MANAGEMENT_LOCATOR_ID,
        getParams: (name) => ({ page: 'enrich_policy', policyName: name }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.enrich.getPolicy({ name }, { signal: abortSignal })).policies[0]?.config,
      unused: {
        message: i18n.translate('xpack.idxMgmt.housekeeping.unusedEnrichPolicyMessage', {
          defaultMessage:
            'No ingest pipeline uses these enrich policies, but their enrich indices still take space. Delete the policies you no longer need.',
        }),
        getFix: (name) => ({
          description: i18n.translate('xpack.idxMgmt.housekeeping.deleteUnusedEnrichPolicyFix', {
            defaultMessage:
              'Deletes the enrich policy and its enrich indices. No ingest pipeline uses it today.',
          }),
          request: `DELETE _enrich/policy/${name}`,
        }),
      },
    },
  ],

  async listResources({ esClient, abortSignal }) {
    const { policies } = await esClient.enrich.getPolicy({}, { signal: abortSignal });
    return policies.flatMap(({ config }) =>
      Object.values(config).flatMap((policy) =>
        policy?.name ? [{ type: 'enrich_policy', id: policy.name }] : []
      )
    );
  },
};

export const LEGACY_TEMPLATES_KEY = 'legacy_index_templates';

export const fetchLegacyTemplates = ({
  esClient,
  fetchOnce,
}: Pick<HousekeepingContext, 'esClient' | 'fetchOnce'>) =>
  fetchOnce(LEGACY_TEMPLATES_KEY, (signal) =>
    esClient.indices.getTemplate({ flat_settings: true }, { signal })
  );

export const legacyTemplateProvider: HousekeepingResourceProvider = {
  id: 'index_management_legacy_templates',
  title: i18n.translate('xpack.idxMgmt.housekeeping.legacyProviderTitle', {
    defaultMessage: 'Legacy index templates',
  }),
  resourceTypes: [
    {
      id: 'legacy_index_template',
      // Same label as composable templates: the legacy check says that they are legacy.
      label: i18n.translate('xpack.idxMgmt.housekeeping.legacyTemplateLabel', {
        defaultMessage: 'Index template',
      }),
      locator: {
        id: INDEX_MANAGEMENT_LOCATOR_ID,
        getParams: (name) => ({ page: 'index_template', indexTemplate: name, legacy: true }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.indices.getTemplate({ name }, { signal: abortSignal }))[name],
    },
  ],
  referencedTypes: ['ingest_pipeline', 'ilm_policy'],
  // Legacy templates are not available in serverless.
  isAvailable: ({ isServerless }) => !isServerless,

  async listResources(context) {
    const templates = await fetchLegacyTemplates(context);
    return Object.entries(templates).map(([name, template]) => ({
      type: 'legacy_index_template',
      id: name,
      isManaged: name.startsWith('.'),
      references: settingReferences(template.settings as Settings),
    }));
  },
};
