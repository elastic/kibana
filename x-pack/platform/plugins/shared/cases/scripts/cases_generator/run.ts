/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCaseRequest, getEventsIndex } from './data_generation';
import { createEsClient, createKbnClient } from './clients';
import { generateCases } from './case_generation';
import { loadConfig } from './config';
import { bulkIndexEvents, indexAlertsForOwners } from './es_indexing';
import {
  cleanupCases,
  cleanupTemplates,
  createSpaces,
  createTemplates,
  enableAnalyticsForSpaces,
} from './kibana_ops';
import { logger } from './logger';
import type { AlertInfo, CreatedTemplateRef, EventInfo, GeneratorConfig } from './types';
import { dedupe, installSeededRandom, pick, randomString, weightedOwnerPick } from './utils';

interface SpaceExecutionPlan {
  space: string;
  ownerCaseCounts: Record<string, number>;
  alertDocsToIndexByOwner: Record<string, number>;
  eventDocsToIndex: number;
  totalCases: number;
  totalAttachments: number;
}

interface ExecutionPlan {
  reqId: string;
  targetSpaces: string[];
  spacePlans: SpaceExecutionPlan[];
  totals: {
    cases: number;
    attachments: number;
    eventDocsToIndex: number;
    templateCreates: number;
    analyticsUpdates: number;
  };
}

// Prints the end-of-run summary line ("Created N cases × M spaces, each
// with X comments…") plus follow-up lines for owner distribution, templates,
// and analytics when those features were used. Called by runGenerator after
// every space has finished generating.
function logFinalSummary(config: GeneratorConfig) {
  logger.info('Done!');
  const numSpaces = config.spaces ? config.spaces.count : 1;
  const totalCases = config.count * numSpaces;
  const summaryParts: string[] = [];
  if (config.comments > 0) summaryParts.push(`${config.comments} comments`);
  if (config.alerts > 0) summaryParts.push(`${config.alerts} alerts`);
  if (config.events > 0) summaryParts.push(`${config.events} events`);
  const perSpaceLabel = numSpaces > 1 ? ` × ${numSpaces} spaces = ${totalCases} total` : '';

  if (summaryParts.length > 0) {
    logger.info(
      `Created ${config.count} cases${perSpaceLabel}, each with ${summaryParts.join(', ')}`
    );
  } else {
    logger.info(`Created ${config.count} cases${perSpaceLabel}`);
  }

  if (config.ownerDistribution) {
    const distStr = config.owners
      .map((owner) => `${owner}:${config.ownerDistribution?.[owner] ?? 0}`)
      .join(', ');
    logger.info(`Owner distribution weights: ${distStr}`);
  }

  if (config.templates.length > 0) {
    const tplSpaceLabel = config.templateSpace || 'default';
    const tplOwnersList = config.templateOwners.join(', ');
    const totalFields = config.templates.reduce((sum, tpl) => sum + tpl.fieldTypes.length, 0);
    const fieldsLabel = totalFields > 0 ? ` (${totalFields} field(s) total)` : '';
    logger.info(
      `Created ${config.templates.length} template(s)${fieldsLabel} in space "${tplSpaceLabel}" for owner(s): ${tplOwnersList}`
    );
    for (const tpl of config.templates) {
      if (tpl.fieldTypes.length > 0) {
        logger.info(`  - ${tpl.name}: ${tpl.fieldTypes.join(', ')}`);
      }
    }
  }

  if (config.analyticsOwners && config.analyticsOwners.length > 0) {
    logger.info(
      `Analytics enabled for [${config.analyticsOwners.join(', ')}] across ${numSpaces} space(s)`
    );
  }
}

// The script's main entry point. Loads config, optionally seeds the RNG,
// then dispatches to the right path: dry-run preview, cleanup, or a real
// generation run (spaces → templates → analytics → alerts/events → cases).
// Called from cases_generator.ts (the bin entry).
// eslint-disable-next-line complexity -- top-level orchestrator branches on many config flags by design
export async function runGenerator(): Promise<void> {
  const config = await loadConfig();
  const restoreRandom = config.seed ? installSeededRandom(config.seed) : null;

  try {
    const spacesConfig = config.spaces;
    const plannedTargetSpaces: string[] =
      spacesConfig && spacesConfig.count > 0
        ? Array.from({ length: spacesConfig.count }, (_, i) =>
            spacesConfig.namePattern.replace('{i}', String(i + 1))
          )
        : [config.space];

    if (config.dryRun) {
      if (config.cleanup) {
        const cleanupSpaces = dedupe([...plannedTargetSpaces, config.templateSpace]);
        logger.info('DRY RUN: cleanup mode (no deletions performed).');
        logger.info(
          `Would delete cases and templates tagged "${config.cleanupTag}" across ${
            cleanupSpaces.length
          } space(s): ${cleanupSpaces.map((s) => s || 'default').join(', ')}`
        );
        return;
      }
      const executionPlan = buildExecutionPlan(config, plannedTargetSpaces);
      logDryRun(config, executionPlan);
      return;
    }

    const reqId = randomString(6);

    const ctx = createKbnClient({
      url: config.kibana,
      username: config.username,
      password: config.password,
      ssl: config.ssl,
      apiKey: config.apiKey,
    });

    if (config.cleanup) {
      await runCleanup(config, ctx, plannedTargetSpaces);
      return;
    }

    const resolvedTargetSpaces: string[] =
      config.spaces && config.spaces.count > 0
        ? await createSpaces(ctx, config.spaces)
        : [config.space];

    const templatesByOwner = new Map<string, CreatedTemplateRef[]>();
    if (config.templates.length > 0 && config.templateOwners.length > 0) {
      const tplSpace = config.templateSpace || 'default';
      logger.info(
        `Creating ${
          config.templates.length
        } template(s) in space "${tplSpace}" for owners: ${config.templateOwners.join(', ')}`
      );
      for (const owner of config.templateOwners) {
        const refs = await createTemplates({
          ctx,
          space: config.templateSpace,
          owner,
          templates: config.templates,
        });
        if (refs.length > 0) templatesByOwner.set(owner, refs);
      }
      const totalApplicable = Array.from(templatesByOwner.values()).reduce(
        (sum, refs) => sum + refs.length,
        0
      );
      logger.info(
        `Template creation complete. ${totalApplicable} template(s) available to apply to generated cases.`
      );
    }

    if (config.analyticsOwners && config.analyticsOwners.length > 0) {
      await enableAnalyticsForSpaces({
        ctx,
        spaces: resolvedTargetSpaces,
        owners: config.analyticsOwners,
      });
    }

    const needsEsClient = config.alerts > 0 || config.events > 0;
    const esClient = needsEsClient
      ? createEsClient({
          node: config.node,
          ssl: config.ssl,
          username: config.username,
          password: config.password,
        })
      : null;

    for (const space of resolvedTargetSpaces) {
      if (resolvedTargetSpaces.length > 1) {
        logger.info(`\n── Space: ${space || 'default'} ──`);
      }

      const cases = Array.from({ length: config.count }, (_, i) => {
        const owner = weightedOwnerPick(config.owners, config.ownerDistribution);
        const ownerTemplates = templatesByOwner.get(owner);
        const template = ownerTemplates && ownerTemplates.length > 0 ? pick(ownerTemplates) : null;
        return buildCaseRequest(i + 1, owner, reqId, template);
      });

      let alertsByOwner = new Map<string, AlertInfo[]>();
      let indexedEvents: EventInfo[] = [];

      const docCtx = { space, kibanaVersion: config.kibanaVersion };
      if (esClient) {
        if (config.alerts > 0) {
          alertsByOwner = await indexAlertsForOwners(esClient, cases, config.alerts, docCtx);
        }
        if (config.events > 0) {
          const nonObservabilityCaseCount = cases.filter(
            (oneCase) => oneCase.owner !== 'observability'
          ).length;
          const totalEvents = nonObservabilityCaseCount * config.events;
          if (totalEvents > 0) {
            const eventIndex = getEventsIndex();
            logger.info(`Indexing ${totalEvents} events into ${eventIndex}...`);
            indexedEvents = await bulkIndexEvents(esClient, eventIndex, totalEvents, docCtx);
          }
        }
      }

      await generateCases(
        {
          cases,
          space,
          commentsPerCase: config.comments,
          alertsPerCase: config.alerts,
          eventsPerCase: config.events,
          alertsByOwner,
          events: indexedEvents,
          concurrency: config.concurrency,
        },
        ctx
      );
    }

    logFinalSummary(config);
  } finally {
    restoreRandom?.();
  }
}

// Iterates the planned target spaces (plus the template space) and deletes
// every case and template tagged with `--cleanupTag` in each. Called by
// runGenerator when --cleanup is set; nothing else happens in cleanup mode.
async function runCleanup(
  config: GeneratorConfig,
  ctx: { kbnClient: import('@kbn/test').KbnClient; headers: Record<string, string> },
  plannedTargetSpaces: string[]
): Promise<void> {
  const cleanupSpaces = dedupe([...plannedTargetSpaces, config.templateSpace]);
  logger.info(
    `Cleanup mode: deleting cases and templates tagged "${config.cleanupTag}" across ${cleanupSpaces.length} space(s)`
  );

  let totalCases = 0;
  let totalTemplates = 0;
  for (const space of cleanupSpaces) {
    if (cleanupSpaces.length > 1) {
      logger.info(`\n── Cleanup space: ${space || 'default'} ──`);
    }
    totalCases += await cleanupCases({ ctx, space, tag: config.cleanupTag });
    totalTemplates += await cleanupTemplates({
      ctx,
      space,
      owners: dedupe([...config.owners, ...config.templateOwners]),
      tag: config.cleanupTag,
    });
  }
  logger.info(`Cleanup complete. Removed ${totalCases} case(s) and ${totalTemplates} template(s).`);
}

// Prints the totals + per-space breakdown of an execution plan without
// touching Kibana or ES. Called by runGenerator when --dryRun is set, to let
// the user sanity-check counts before running for real.
function logDryRun(config: GeneratorConfig, executionPlan: ExecutionPlan) {
  logger.info('DRY RUN: no data will be written.');
  logger.info(`Request seed: ${config.seed ?? 'none'}`);
  logger.info(`Request ID preview: ${executionPlan.reqId}`);
  logger.info(
    `Templates to create: ${executionPlan.totals.templateCreates}, analytics updates: ${executionPlan.totals.analyticsUpdates}`
  );
  logger.info(
    `Totals => cases=${executionPlan.totals.cases}, attachments=${executionPlan.totals.attachments}, indexedEvents=${executionPlan.totals.eventDocsToIndex}`
  );

  for (const spacePlan of executionPlan.spacePlans) {
    logger.info(`\n[Space ${spacePlan.space || 'default'}]`);
    logger.info(`  cases=${spacePlan.totalCases}, attachments=${spacePlan.totalAttachments}`);
    logger.info(`  ownerCaseCounts=${JSON.stringify(spacePlan.ownerCaseCounts)}`);
    logger.info(`  alertDocsToIndexByOwner=${JSON.stringify(spacePlan.alertDocsToIndexByOwner)}`);
    logger.info(`  eventDocsToIndex=${spacePlan.eventDocsToIndex}`);
  }
}

// Pure projection of the run that will happen: simulates owner picks for
// every case in every space, and totals up cases, attachments, alert/event
// docs to index, template creates, and analytics updates. Used by --dryRun
// and exercised heavily by run.test.ts; doing this without seeding will give
// a different result every call because owner picks are randomized.
export function buildExecutionPlan(config: GeneratorConfig, targetSpaces: string[]): ExecutionPlan {
  const reqId = randomString(6);
  const spacePlans: SpaceExecutionPlan[] = [];
  let totalCases = 0;
  let totalAttachments = 0;
  let totalIndexedEvents = 0;

  for (const space of targetSpaces) {
    const ownerCaseCounts: Record<string, number> = {};
    for (const owner of config.owners) {
      ownerCaseCounts[owner] = 0;
    }

    for (let i = 0; i < config.count; i++) {
      const owner = weightedOwnerPick(config.owners, config.ownerDistribution);
      ownerCaseCounts[owner] = (ownerCaseCounts[owner] ?? 0) + 1;
    }

    const alertDocsToIndexByOwner: Record<string, number> = {};
    for (const [owner, caseCount] of Object.entries(ownerCaseCounts)) {
      if (caseCount > 0 && config.alerts > 0) {
        alertDocsToIndexByOwner[owner] = caseCount * config.alerts;
      }
    }

    const nonObservabilityCaseCount = Object.entries(ownerCaseCounts).reduce(
      (sum, [owner, caseCount]) => sum + (owner === 'observability' ? 0 : caseCount),
      0
    );
    const eventDocsToIndex = nonObservabilityCaseCount * config.events;

    const attachmentsForSpace =
      config.comments * config.count +
      config.alerts * config.count +
      config.events * nonObservabilityCaseCount;

    totalCases += config.count;
    totalAttachments += attachmentsForSpace;
    totalIndexedEvents += eventDocsToIndex;

    spacePlans.push({
      space,
      ownerCaseCounts,
      alertDocsToIndexByOwner,
      eventDocsToIndex,
      totalCases: config.count,
      totalAttachments: attachmentsForSpace,
    });
  }

  return {
    reqId,
    targetSpaces,
    spacePlans,
    totals: {
      cases: totalCases,
      attachments: totalAttachments,
      eventDocsToIndex: totalIndexedEvents,
      templateCreates: config.templates.length * config.templateOwners.length,
      analyticsUpdates: (config.analyticsOwners?.length ?? 0) * targetSpaces.length,
    },
  };
}
