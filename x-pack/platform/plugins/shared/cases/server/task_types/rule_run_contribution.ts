/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleRunContribution } from '@kbn/alerting-plugin/server/task_types/rule_run_contribution';
import { getCasesConnectorAdapter, getCasesConnectorType } from '../connectors/cases';
import type { CasesTaskProcessSettings } from './cases_task_process_settings';

const kibanaOnly = (what: string) => () => {
  throw new Error(
    `${what} is not available in a task process: Kibana executes the cases connector`
  );
};

/**
 * The cases system action as a rule run sees it: the connector type, so the rule's actions can be
 * enqueued and authorized, and the adapter that builds the connector's parameters from the alerts.
 * Executing the connector is Kibana's job, so the services it would use throw here.
 */
export const contribution: RuleRunContribution = {
  declares: { registersConnectorTypes: true },
  register: ({ actions, alerting }, { logger, settings }) => {
    const cases = settings.cases as CasesTaskProcessSettings | undefined;
    if (!cases) return;
    actions.registerSubActionConnectorType(
      getCasesConnectorType({
        getCasesClient: kibanaOnly('The cases client') as never,
        getActionsClient: kibanaOnly('The actions client') as never,
        getSpaceId: kibanaOnly('The space id') as never,
        getUnsecuredSavedObjectsClient: kibanaOnly('A saved objects client') as never,
        getUiSettingsClient: kibanaOnly('A ui settings client') as never,
        serverlessProjectType: cases.serverlessProjectType,
        isCasesAttachmentsEnabled: cases.isCasesAttachmentsEnabled,
        isTemplatesEnabled: cases.isTemplatesEnabled,
        isAtLeastPlatinum: kibanaOnly('The license check') as never,
      })
    );
    alerting.registerConnectorAdapter(
      getCasesConnectorAdapter({ serverlessProjectType: cases.serverlessProjectType, logger })
    );
  },
};
