/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityTaskPluginStart } from '@kbn/security-plugin/server/task_plugin';
import type { TaskHost } from '@kbn/task-manager-plugin/server/task_type_module';
import type {
  WorkflowStepsContribution,
  WorkflowStepsRegistry,
  WorkflowTriggerEmitterSource,
} from '@kbn/workflows-extensions/server';
import type { CasesAlertsClient } from '../services/alerts';
import { APP_ID } from '../../common/constants';
import { CasesEventBus } from '../events/event_bus';
import { createCasesClientExtensions } from './create_client_extensions';
import { registerCaseWorkflowSteps } from '../workflows';
import { registerCaseWorkflowTriggers } from '../workflows/triggers';
import { registerCasesWorkflowEventBridge } from '../workflows/triggers/event_bridge';
import { createCasesAttachmentTypeRegistry } from './create_attachment_type_registry';
import type { CasesTaskProcessAttachmentTypes } from './create_attachment_type_registry';
import type { CasesTaskProcessSettings } from './cases_task_process_settings';
import { getCasesTaskProcessSavedObjectTypes } from './cases_saved_object_types';
import { createCasesRunServices } from './create_cases_run_services';

/**
 * Wraps the steps so that the events they emit (the cases bus forwards them to the workflow
 * triggers without waiting) have been handed to the engine when the step completes: a process ends
 * with the run.
 */
const withEventsFlushed = (
  registry: WorkflowStepsRegistry,
  flushEvents: () => Promise<void>
): WorkflowStepsRegistry => {
  type Definition = Parameters<WorkflowStepsRegistry['registerStepDefinition']>[0];
  const wrap = (definition: Definition): Definition => {
    if (typeof definition === 'function') {
      return (async () => {
        const loaded = await definition();
        return loaded && wrap(loaded);
      }) as Definition;
    }
    if (!('handler' in definition)) return definition;
    const { handler } = definition;
    return {
      ...definition,
      handler: async (context: Parameters<typeof handler>[0]) => {
        try {
          return await handler(context);
        } finally {
          await flushEvents();
        }
      },
    } as Definition;
  };
  return {
    registerTriggerDefinition: (definition) => registry.registerTriggerDefinition(definition),
    registerStepDefinition: (definition) => registry.registerStepDefinition(wrap(definition)),
  };
};

/** Registers native Cases workflow steps, attachment types and solution event services. */
export const contribution: WorkflowStepsContribution = {
  declares: {
    savedObjectTypes: getCasesTaskProcessSavedObjectTypes(),
    settings: ['cases'],
    // `register` below reads the rule registry's alerts client (`ruleRegistry`, for RAC-backed cases
    // steps) and, when spaces is enabled, the spaces service (`spaces`, for the space-scoped cases
    // client): both are services another pack provides, not this one.
    requires: ['ruleRegistry', 'spaces'],
    // Every `cases.*` step type `register` below can register: `casesStepRegistry` (./registry.ts)
    // plus the three it adds on top (`createCaseFromTemplate` always, `setExtendedFields` and
    // `addAttachments` each behind their own flag). Lets `resolvePacksForDefinition` select this
    // pack for a workflow that uses one of these steps instead of falling back to a full load.
    stepTypes: [
      'cases.addAlerts',
      'cases.addAttachments',
      'cases.addComment',
      'cases.addEvents',
      'cases.addObservables',
      'cases.addTags',
      'cases.assignCase',
      'cases.bulkDeleteObservables',
      'cases.closeCase',
      'cases.createCase',
      'cases.createCaseFromTemplate',
      'cases.deleteAttachments',
      'cases.deleteCases',
      'cases.deleteObservable',
      'cases.findCases',
      'cases.findSimilarCases',
      'cases.getAllAttachments',
      'cases.getCase',
      'cases.getCases',
      'cases.getCasesByAlertId',
      'cases.pushCases',
      'cases.removeTags',
      'cases.setCategory',
      'cases.setCustomField',
      'cases.setDescription',
      'cases.setExtendedFields',
      'cases.setSeverity',
      'cases.setStatus',
      'cases.setTitle',
      'cases.unassignCase',
      'cases.updateCase',
      'cases.updateCases',
      'cases.updateObservable',
    ],
  },
  provides: {
    'cases.attachmentTypes': ({ host, settings }) => {
      const snapshot = (settings.cases as CasesTaskProcessSettings | undefined)?.workflows;
      if (!snapshot)
        throw new Error('Cases attachment registrations require their dispatch snapshot');
      return createCasesAttachmentTypeRegistry(host as TaskHost, snapshot.attachmentTypeIds);
    },
  },
  register: (registry, context) => {
    const { host, logger, services, settings, publicBaseUrl, registerRunCheck } = context;
    if (!services) throw new Error('The workflows task process did not give the engine services');
    const workflows = (settings.cases as CasesTaskProcessSettings | undefined)?.workflows;
    // Cases is disabled in Kibana, which then sends no settings: nothing to register, and a workflow
    // that uses a cases step is declined for the missing step.
    if (!workflows) return;
    const {
      elasticsearch,
      analytics,
      savedObjects,
      licensing,
      userProfile,
      security,
      usageCounters,
      plugins,
    } = host as TaskHost;
    const securityPlugin = plugins?.security as SecurityTaskPluginStart | undefined;
    if (!securityPlugin) throw new Error('The task process did not get the security plugin');
    if (!usageCounters) throw new Error('The workflows task module did not get usage counters');
    if (!licensing) throw new Error('The workflows task module did not get the license');
    if (!userProfile) {
      throw new Error('The task process host did not lend Core user profile service');
    }

    const attachmentTypes =
      services.getService<CasesTaskProcessAttachmentTypes>('cases.attachmentTypes');
    registerRunCheck?.(({ type }) =>
      type.startsWith('cases.') ? attachmentTypes.getParityError() : undefined
    );
    const casesLogger = logger.get('cases');
    const casesEventBus = new CasesEventBus(casesLogger);
    const clientExtensions = createCasesClientExtensions(context, workflows);
    clientExtensions.registerAlertStatusListeners(casesEventBus);
    registerRunCheck?.(({ type }) =>
      type.startsWith('cases.') ? clientExtensions.getParityError() : undefined
    );
    const { getCasesClient } = createCasesRunServices({
      logger: casesLogger,
      settings: workflows,
      elasticsearch,
      savedObjects,
      security: securityPlugin,
      securityService: security,
      isFipsMode: security.fips.isEnabled(),
      unifiedAttachmentTypeRegistry: attachmentTypes.registry,
      getAttachmentParityError: () =>
        attachmentTypes.getParityError() ?? clientExtensions.getParityError(),
      closeReasonValidator: clientExtensions.closeReasonValidator,
      getRacClientWithRequest: (request) =>
        services
          .getService<{
            getRacClientWithRequest: (scopedRequest: KibanaRequest) => Promise<CasesAlertsClient>;
          }>('ruleRegistry')
          .getRacClientWithRequest(request),
      userProfile,
      spaces: workflows.spacesEnabled
        ? services.getService<SpacesPluginStart>('spaces').spacesService
        : undefined,
      licensing,
      getActionsClientWithRequest: services.getActionsClientWithRequest,
      getUnsecuredActionsClient: () =>
        services.getUnsecuredActionsClient() as IUnsecuredActionsClient,
      usageCounter: usageCounters.getUsageCounter(APP_ID),
      filesUsageCounter: usageCounters.getUsageCounter('files'),
      analytics,
      publicBaseUrl,
      casesEventBus,
    });

    // The events the steps emit and that are still in flight: the process ends with the run.
    const pendingEvents = new Set<Promise<void>>();
    const workflowsExtensions: WorkflowTriggerEmitterSource = {
      getClient: async (request: KibanaRequest) => ({
        emitEvent: (triggerId, payload) => {
          const emitted = services.emitEvent({ triggerId, payload, request });
          pendingEvents.add(emitted);
          const forget = () => pendingEvents.delete(emitted);
          emitted.then(forget, forget);
          return emitted;
        },
      }),
    };
    registerCasesWorkflowEventBridge(casesEventBus, workflowsExtensions, casesLogger);
    const flushEvents = async () => {
      // The bridge emits without waiting: let it start the emissions first.
      await new Promise((resolve) => setImmediate(resolve));
      await Promise.allSettled([...pendingEvents]);
    };

    registerCaseWorkflowTriggers(registry);
    registerCaseWorkflowSteps(withEventsFlushed(registry, flushEvents), {
      getCasesClient,
      isTemplatesEnabled: workflows.config.templates.enabled,
      addAttachments: workflows.config.attachments.enabled
        ? {
            unifiedAttachmentTypeRegistry: attachmentTypes.registry,
            waitForAttachmentTypes: () => Promise.resolve(),
          }
        : undefined,
    });
  },
};
