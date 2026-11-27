/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  HousekeepingContext,
  HousekeepingResourceProvider,
} from '@kbn/housekeeping-plugin/server';

// Defined by the public locator of this plugin, which the server can't import.
const PIPELINES_LOCATOR_ID = 'INGEST_PIPELINES_APP_LOCATOR';

const CALLED_PIPELINE_IMPACT = i18n.translate(
  'xpack.ingestPipelines.housekeeping.missingCalledPipelineImpact',
  { defaultMessage: 'Documents that reach this pipeline processor fail.' }
);

const ENRICH_POLICY_IMPACT = i18n.translate(
  'xpack.ingestPipelines.housekeeping.missingEnrichPolicyImpact',
  { defaultMessage: 'Documents that reach this enrich processor fail.' }
);

interface ProcessorReference {
  targetType: 'ingest_pipeline' | 'enrich_policy';
  name: string;
  optional: boolean;
}

/** What `pipeline` and `enrich` processors point at, including nested processors. */
export const getProcessorReferences = (processors: unknown): ProcessorReference[] => {
  if (!Array.isArray(processors)) {
    return [];
  }
  return processors.flatMap((processor) =>
    Object.entries(processor ?? {}).flatMap(([type, config]) => {
      const {
        name,
        policy_name: policyName,
        on_failure: onFailure,
        processor: inner,
        ignore_missing_pipeline: ignoreMissing,
      } = (config ?? {}) as Record<string, unknown>;
      const references: ProcessorReference[] = [];
      // Templated names are resolved per document.
      if (type === 'pipeline' && typeof name === 'string' && !name.includes('{{')) {
        references.push({ targetType: 'ingest_pipeline', name, optional: ignoreMissing === true });
      }
      if (type === 'enrich' && typeof policyName === 'string') {
        references.push({ targetType: 'enrich_policy', name: policyName, optional: false });
      }
      return [
        ...references,
        ...getProcessorReferences(onFailure),
        ...(inner ? getProcessorReferences([inner]) : []),
      ];
    })
  );
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Documents processed per pipeline, and for how long they were counted: node stats reset when a
 * node restarts, so the window is the uptime of the ingest node that started last.
 */
const getPipelineUsage = async ({ esClient, abortSignal, isServerless }: HousekeepingContext) => {
  if (isServerless) {
    return undefined;
  }
  try {
    const { nodes } = await esClient.nodes.stats(
      { metric: ['ingest', 'jvm'] },
      { signal: abortSignal }
    );
    const counts = new Map<string, number>();
    let windowMs = Infinity;
    for (const node of Object.values(nodes)) {
      if (node.roles && !node.roles.includes('ingest')) {
        continue;
      }
      windowMs = Math.min(windowMs, node.jvm?.uptime_in_millis ?? 0);
      for (const [name, stats] of Object.entries(node.ingest?.pipelines ?? {})) {
        counts.set(name, (counts.get(name) ?? 0) + (stats.count ?? 0));
      }
    }
    return { counts, days: Math.floor((Number.isFinite(windowMs) ? windowMs : 0) / DAY_MS) };
  } catch {
    return undefined;
  }
};

export const createPipelineResourceProvider = ({
  unusedAfterDays,
}: {
  unusedAfterDays: number;
}): HousekeepingResourceProvider => ({
  id: 'ingest_pipelines',
  title: i18n.translate('xpack.ingestPipelines.housekeeping.providerTitle', {
    defaultMessage: 'Ingest Pipelines',
  }),
  resourceTypes: [
    {
      id: 'ingest_pipeline',
      label: i18n.translate('xpack.ingestPipelines.housekeeping.pipelineLabel', {
        defaultMessage: 'Ingest pipeline',
      }),
      locator: {
        id: PIPELINES_LOCATOR_ID,
        getParams: (name) => ({ page: 'pipelines_list', pipelineId: name }),
      },
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.ingest.getPipeline({ id: name }, { signal: abortSignal }))[name],
      unused: {
        message: i18n.translate('xpack.ingestPipelines.housekeeping.unusedPipelineMessage', {
          defaultMessage:
            'No index, template or other pipeline uses this pipeline, and it has not processed any document while the ingest nodes have been running. Clients outside the cluster, such as Logstash, only show up once they send documents.',
        }),
        getFix: (name) => ({
          description: i18n.translate(
            'xpack.ingestPipelines.housekeeping.deleteUnusedPipelineFix',
            {
              defaultMessage:
                'Deletes the pipeline. Before running it, check that no client outside the cluster, such as Logstash, Beats or Elastic Agent, sends documents through it.',
            }
          ),
          request: `DELETE _ingest/pipeline/${name}`,
        }),
      },
    },
  ],
  referencedTypes: ['ingest_pipeline', 'enrich_policy'],

  async listResources(context) {
    const { esClient, fetchOnce } = context;
    const [pipelines, usage] = await Promise.all([
      // ES returns 404 when there are no pipelines
      fetchOnce('ingest_pipelines', (signal) =>
        esClient.ingest.getPipeline({}, { ignore: [404], signal })
      ),
      getPipelineUsage(context),
    ]);

    const resources = Object.entries(pipelines).map(([name, pipeline]) => {
      const processed = usage?.counts.get(name) ?? 0;
      return {
        type: 'ingest_pipeline',
        id: name,
        isManaged: pipeline._meta?.managed === true,
        inUse: processed > 0,
        details: usage
          ? [
              i18n.translate('xpack.ingestPipelines.housekeeping.observedWindow', {
                defaultMessage:
                  'No documents in the last {days, plural, one {# day} other {# days}}',
                values: { days: usage.days },
              }),
            ]
          : undefined,
        evidence: usage ? { processedDocuments: processed, observedDays: usage.days } : undefined,
        references: [
          ...getProcessorReferences(pipeline.processors),
          ...getProcessorReferences(pipeline.on_failure),
        ].map(({ targetType, name: target, optional }) => ({
          targetType,
          targetId: target,
          optional,
          via: targetType === 'enrich_policy' ? 'enrich processor' : 'pipeline processor',
          impact: targetType === 'enrich_policy' ? ENRICH_POLICY_IMPACT : CALLED_PIPELINE_IMPACT,
        })),
      };
    });

    if (!usage) {
      return {
        resources,
        unusedNotChecked: [
          {
            type: 'ingest_pipeline',
            reason: i18n.translate('xpack.ingestPipelines.housekeeping.noUsageReason', {
              defaultMessage:
                'Elasticsearch does not report how many documents each pipeline processed.',
            }),
          },
        ],
      };
    }
    if (usage.days < unusedAfterDays) {
      return {
        resources,
        unusedNotChecked: [
          {
            type: 'ingest_pipeline',
            reason: i18n.translate('xpack.ingestPipelines.housekeeping.shortWindowReason', {
              defaultMessage:
                'The ingest nodes started {days, plural, one {# day} other {# days}} ago. Unused pipelines are reported after {threshold, plural, one {# day} other {# days}} without documents.',
              values: { days: usage.days, threshold: unusedAfterDays },
            }),
          },
        ],
      };
    }
    return resources;
  },
});
