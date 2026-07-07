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
import { indexAlertsForOwners, indexOrReuseEvents } from './es_indexing';
import {
  cleanupCases,
  cleanupLegacyForSpaces,
  cleanupTemplates,
  configureLegacyForSpaces,
  createSpaces,
  createTemplates,
  enableAnalyticsForSpaces,
  listAllSpaces,
} from './kibana_ops';
import {
  buildLegacyCustomFieldValuesForCase,
  LEGACY_CUSTOM_FIELDS_CONFIG,
} from './configure_customfields';
import { logger } from './logger';
import type { AlertInfo, CreatedTemplateRef, EventInfo, GeneratorConfig } from './types';
import { dedupe, installSeededRandom, pick, randomString, rng, weightedOwnerPick } from './utils';

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
  // The default space is included additively whenever multi-space mode is
  // active, so the final summary should reflect (created spaces + 1) — not
  // just the created count.
  const numSpaces = config.spaces && config.spaces.count > 0 ? config.spaces.count + 1 : 1;
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
    const tplOwnersList = config.templateOwners.join(', ');
    const kitchenSinkCount = config.templates.filter((tpl) => tpl.useKitchenSink).length;
    const synthesizedFields = config.templates.reduce(
      (sum, tpl) => sum + (tpl.useKitchenSink ? 0 : tpl.fieldTypes.length),
      0
    );
    const labelParts: string[] = [];
    if (kitchenSinkCount > 0) labelParts.push(`${kitchenSinkCount} kitchen-sink`);
    if (synthesizedFields > 0) labelParts.push(`${synthesizedFields} synthesized field(s) total`);
    const fieldsLabel = labelParts.length > 0 ? ` (${labelParts.join(', ')})` : '';
    logger.info(
      `Created ${config.templates.length} template(s)${fieldsLabel} per case-target space (${numSpaces}) for owner(s): ${tplOwnersList}`
    );
    for (const tpl of config.templates) {
      if (tpl.useKitchenSink) {
        logger.info(`  - ${tpl.name}: kitchen-sink YAML`);
      } else if (tpl.fieldTypes.length > 0) {
        logger.info(`  - ${tpl.name}: ${tpl.fieldTypes.join(', ')}`);
      }
    }
  }

  if (config.analyticsOwners && config.analyticsOwners.length > 0) {
    logger.info(
      `Analytics enabled for [${config.analyticsOwners.join(', ')}] across ${numSpaces} space(s)`
    );
  }

  if (config.legacyCustomFields) {
    logger.info(
      `Legacy typed customFields registered for owner(s) [${config.owners.join(
        ', '
      )}] across ${numSpaces} space(s); each generated case carries ${
        LEGACY_CUSTOM_FIELDS_CONFIG.length
      } typed value(s)`
    );
  }
  if (config.legacyTemplates) {
    logger.info(
      `Legacy templates registered for owner(s) [${config.owners.join(
        ', '
      )}] across ${numSpaces} space(s) (visible in the Cases UI as "Create from template"; not auto-applied to generated cases since the case API has no legacy-template reference field)`
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
    // Multi-space mode is additive: the default space always participates so
    // a fresh demo dataset shows up where users land first, alongside the
    // freshly created spaces.
    const plannedTargetSpaces: string[] =
      spacesConfig && spacesConfig.count > 0
        ? dedupe([
            '',
            ...Array.from({ length: spacesConfig.count }, (_, i) =>
              spacesConfig.namePattern.replace('{i}', String(i + 1))
            ),
          ])
        : [config.space];

    if (config.dryRun) {
      if (config.cleanup) {
        logger.info('DRY RUN: cleanup mode (no deletions performed).');
        const legacyTrailer = `Will also strip ${LEGACY_CUSTOM_FIELDS_CONFIG.length} script-owned customField(s) and the script's legacy templates from each owner's configure SO.`;
        if (config.cleanupSpaces && config.cleanupSpaces.length > 0) {
          logger.info(
            `Would delete cases and templates tagged "${config.cleanupTag}" across ${
              config.cleanupSpaces.length
            } space(s): ${config.cleanupSpaces
              .map((s) => s || 'default')
              .join(', ')}. ${legacyTrailer}`
          );
        } else {
          logger.info(
            `Would delete cases and templates tagged "${config.cleanupTag}" in every Kibana space (discovered at run time). ${legacyTrailer}`
          );
        }
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
      await runCleanup(config, ctx);
      return;
    }

    // Multi-space mode is additive: '' (default) is always included so the
    // default space gets a copy of the dataset alongside any newly created
    // spaces. createSpaces only creates the non-default IDs.
    const resolvedTargetSpaces: string[] =
      config.spaces && config.spaces.count > 0
        ? dedupe(['', ...(await createSpaces(ctx, config.spaces))])
        : [config.space];

    // Templates are space-scoped saved objects: a case POST in space X can
    // only reference a template that was created in space X, so we create
    // one copy of every template per (space × owner). The map is keyed by
    // space then by owner, mirroring how the per-space case-generation loop
    // below looks them up.
    const templatesByOwnerBySpace = new Map<string, Map<string, CreatedTemplateRef[]>>();
    if (config.templates.length > 0 && config.templateOwners.length > 0) {
      logger.info(
        `Creating ${config.templates.length} template(s) for owners [${config.templateOwners.join(
          ', '
        )}] in ${resolvedTargetSpaces.length} target space(s)`
      );
      let totalCreated = 0;
      for (const space of resolvedTargetSpaces) {
        const ownerMap = new Map<string, CreatedTemplateRef[]>();
        for (const owner of config.templateOwners) {
          const refs = await createTemplates({
            ctx,
            space,
            owner,
            templates: config.templates,
          });
          if (refs.length > 0) {
            ownerMap.set(owner, refs);
            totalCreated += refs.length;
          }
        }
        if (ownerMap.size > 0) templatesByOwnerBySpace.set(space, ownerMap);
      }
      logger.info(
        `Template creation complete. ${totalCreated} template(s) available to apply to generated cases.`
      );
    }

    if (config.analyticsOwners && config.analyticsOwners.length > 0) {
      await enableAnalyticsForSpaces({
        ctx,
        spaces: resolvedTargetSpaces,
        owners: config.analyticsOwners,
      });
    }

    // Install typed customFields and/or legacy templates on the cases-configure
    // SO before generating cases, otherwise the case POSTs would fail validation
    // on `customFields` (unknown keys) or "create from template" wouldn't
    // surface the templates we expect to test against.
    if (config.legacyCustomFields || config.legacyTemplates) {
      await configureLegacyForSpaces({
        ctx,
        spaces: resolvedTargetSpaces,
        owners: config.owners,
        install: {
          customFields: config.legacyCustomFields,
          templates: config.legacyTemplates,
        },
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

      // Templates are looked up per-space so generated cases reference the
      // template copy that lives in their own space.
      const ownerTemplatesForSpace = templatesByOwnerBySpace.get(space);
      const cases = Array.from({ length: config.count }, (_, i) => {
        const owner = weightedOwnerPick(config.owners, config.ownerDistribution);
        const ownerTemplates = ownerTemplatesForSpace?.get(owner);
        // Only some cases pick up the template — the rest stay vanilla so the
        // dataset shows a realistic mix of "from template" and "ad-hoc" cases.
        const shouldUseTemplate =
          ownerTemplates && ownerTemplates.length > 0 && rng() * 100 < config.templateUsagePercent;
        const template = shouldUseTemplate ? pick(ownerTemplates) : null;
        // When --legacyCustomFields is on, the configure SO has typed
        // customFields registered for this owner, so every case must POST
        // matching {key, type, value} entries to satisfy the API contract.
        const legacyCustomFieldValues = config.legacyCustomFields
          ? buildLegacyCustomFieldValuesForCase()
          : undefined;
        return buildCaseRequest(i + 1, owner, reqId, template, { legacyCustomFieldValues });
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
            indexedEvents = await indexOrReuseEvents(
              esClient,
              getEventsIndex(),
              totalEvents,
              docCtx
            );
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

// Resolves which spaces a --cleanup run should touch. When the user supplied
// --cleanupSpaces (or its interactive equivalent), the request is honored
// verbatim. Otherwise we ask Kibana for every space ID so cleanup is truly
// global — independent of whatever --space/--numSpaces were set to.
async function resolveCleanupSpaces(
  config: GeneratorConfig,
  ctx: { kbnClient: import('@kbn/test').KbnClient; headers: Record<string, string> }
): Promise<string[]> {
  if (config.cleanupSpaces && config.cleanupSpaces.length > 0) {
    return dedupe(config.cleanupSpaces);
  }
  logger.info('Cleanup scope: every Kibana space (discovering via spaces API)...');
  return listAllSpaces(ctx);
}

// Iterates the cleanup target spaces and deletes every case and template
// tagged with `--cleanupTag` in each. Defaults to every Kibana space (global
// cleanup); pass --cleanupSpaces to scope. Called by runGenerator when
// --cleanup is set; nothing else happens in cleanup mode.
async function runCleanup(
  config: GeneratorConfig,
  ctx: { kbnClient: import('@kbn/test').KbnClient; headers: Record<string, string> }
): Promise<void> {
  const cleanupSpaces = await resolveCleanupSpaces(config, ctx);
  logger.info(
    `Cleanup mode: deleting cases and templates tagged "${config.cleanupTag}" across ${
      cleanupSpaces.length
    } space(s): ${cleanupSpaces.map((s) => s || 'default').join(', ')}`
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

  // Wipe the legacy customFields and templates this script installed on the
  // configure SO so reruns of --legacyCustomFields / --legacyTemplates start
  // from a clean slate. Manually-added entries are preserved by key/tag.
  const legacyCleanupOwners = dedupe([...config.owners, ...config.templateOwners]);
  const legacyTotals = await cleanupLegacyForSpaces({
    ctx,
    spaces: cleanupSpaces,
    owners: legacyCleanupOwners,
  });

  logger.info(
    `Cleanup complete. Removed ${totalCases} case(s), ${totalTemplates} template(s), ${legacyTotals.customFieldsRemoved} legacy customField(s), and ${legacyTotals.templatesRemoved} legacy template(s).`
  );
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
  if (executionPlan.totals.templateCreates > 0) {
    logger.info(`Template usage percent: ~${config.templateUsagePercent}% of generated cases`);
  }
  if (config.legacyCustomFields) {
    logger.info(
      `Legacy customFields to register on configure SO: ${LEGACY_CUSTOM_FIELDS_CONFIG.length} per owner across ${executionPlan.targetSpaces.length} space(s) (every generated case will set typed values)`
    );
  }
  if (config.legacyTemplates) {
    logger.info(
      `Legacy templates to register on configure SO: 3 per owner across ${executionPlan.targetSpaces.length} space(s) (visible in UI; not auto-applied to generated cases)`
    );
  }
  logger.info(
    `Totals => cases=${executionPlan.totals.cases}, attachments=${executionPlan.totals.attachments}, indexedEvents=${executionPlan.totals.eventDocsToIndex} (alerts/events may be reused from existing data — see indexing logs at run time)`
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
      templateCreates: config.templates.length * config.templateOwners.length * targetSpaces.length,
      analyticsUpdates: (config.analyticsOwners?.length ?? 0) * targetSpaces.length,
    },
  };
}
