/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  getAttackDiscoveryMarkdown,
} from '@kbn/elastic-assistant-common';
import { CasesConnector } from './cases_connector';
import { DEFAULT_MAX_OPEN_CASES } from './constants';
import {
  CASES_CONNECTOR_ID,
  CASES_CONNECTOR_TITLE,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { getOwnerFromRuleConsumerProducer } from '../../../common/utils/owner';

import type {
  CaseAlert,
  CasesConnectorConfig,
  CasesConnectorParams,
  CasesConnectorRuleActionParams,
  CasesConnectorSecrets,
  CasesGroupedAlerts,
} from './types';
import {
  AttackDiscoveryExpandedAlertsSchema,
  CasesConnectorConfigSchema,
  CasesConnectorRuleActionParamsSchema,
  CasesConnectorSecretsSchema,
} from './schema';
import type { CasesClient } from '../../client';
import { constructRequiredKibanaPrivileges } from './utils';

interface GetCasesConnectorTypeArgs {
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
  getUnsecuredSavedObjectsClient: (
    request: KibanaRequest,
    savedObjectTypes: string[]
  ) => Promise<SavedObjectsClientContract>;
  getSpaceId: (request?: KibanaRequest) => string;
  isServerlessSecurity?: boolean;
}

export const getCasesConnectorType = ({
  getCasesClient,
  getSpaceId,
  getUnsecuredSavedObjectsClient,
  isServerlessSecurity,
}: GetCasesConnectorTypeArgs): SubActionConnectorType<
  CasesConnectorConfig,
  CasesConnectorSecrets
> => ({
  id: CASES_CONNECTOR_ID,
  name: CASES_CONNECTOR_TITLE,
  getService: (params) =>
    new CasesConnector({
      casesParams: { getCasesClient, getSpaceId, getUnsecuredSavedObjectsClient },
      connectorParams: params,
    }),
  schema: {
    config: CasesConnectorConfigSchema,
    secrets: CasesConnectorSecretsSchema,
  },
  supportedFeatureIds: [
    UptimeConnectorFeatureId,
    AlertingConnectorFeatureId,
    SecurityConnectorFeatureId,
  ],
  minimumLicenseRequired: 'platinum' as const,
  isSystemActionType: true,
  getKibanaPrivileges: ({ params } = { params: { subAction: 'run', subActionParams: {} } }) => {
    if (!params?.subActionParams?.owner) {
      throw new Error('Cannot authorize cases. Owner is not defined in the subActionParams.');
    }

    const owner = isServerlessSecurity
      ? SECURITY_SOLUTION_OWNER
      : (params?.subActionParams?.owner as string);

    return constructRequiredKibanaPrivileges(owner);
  },
});

const getAttackDiscoveryCaseGroupedAlerts = (alerts: CaseAlert[]): CasesGroupedAlerts[] => {
  /**
   * First we should validate that the alerts array schema complies with the attack discovery object.
   */
  const attackDiscoveryAlerts = AttackDiscoveryExpandedAlertsSchema.validate(
    alerts,
    {},
    undefined,
    { stripUnknownKeys: true }
  );

  /**
   * For each attack discovery alert we would like to create one separate case.
   */
  const groupedAlerts = attackDiscoveryAlerts.map((attackAlert) => {
    const alertsIndexPattern = attackAlert.kibana.alert.rule.parameters.alertsIndexPattern;
    const attackDiscoveryId = attackAlert._id;
    const attackDiscovery = attackAlert.kibana.alert.attack_discovery;
    const attackDiscoveryTitle = attackDiscovery.title;
    const alertIds = attackDiscovery.alert_ids;

    /**
     * Each attack discovery alert references a list of SIEM alerts that led to the attack.
     * These SIEM alerts will be added to the case.
     */
    return {
      alerts: alertIds.map((siemAlertId) => ({ _id: siemAlertId, _index: alertsIndexPattern })),
      grouping: { attack_discovery: attackDiscoveryId },
      comments: [
        getAttackDiscoveryMarkdown({
          attackDiscovery: {
            id: attackDiscoveryId,
            alertIds,
            detailsMarkdown: attackDiscovery.details_markdown,
            entitySummaryMarkdown: attackDiscovery.entity_summary_markdown,
            mitreAttackTactics: attackDiscovery.mitre_attack_tactics,
            summaryMarkdown: attackDiscovery.summary_markdown,
            title: attackDiscoveryTitle,
          },
          replacements: attackDiscovery.replacements?.reduce((acc: Record<string, string>, r) => {
            acc[r.uuid] = r.value;
            return acc;
          }, {}),
        }),
      ],
      title: attackDiscoveryTitle,
    };
  });

  return groupedAlerts;
};

export const getCasesConnectorAdapter = ({
  isServerlessSecurity,
}: {
  isServerlessSecurity?: boolean;
}): ConnectorAdapter<CasesConnectorRuleActionParams, CasesConnectorParams> => {
  return {
    connectorTypeId: CASES_CONNECTOR_ID,
    ruleActionParamsSchema: CasesConnectorRuleActionParamsSchema,
    buildActionParams: ({ alerts, rule, params, ruleUrl }) => {
      const caseAlerts = [...alerts.new.data, ...alerts.ongoing.data];

      /**
       * We handle attack discovery alerts differently than other alerts and group
       * their building block SIEM alerts that led to each attack separately.
       */
      let referencedAlerts = false;
      let groupedAlerts: CasesGroupedAlerts[] | null = null;
      if (rule.alertTypeId === ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID) {
        groupedAlerts = getAttackDiscoveryCaseGroupedAlerts(caseAlerts);
        referencedAlerts = true;
      }

      const owner = getOwnerFromRuleConsumerProducer({
        consumer: rule.consumer,
        producer: rule.producer,
        isServerlessSecurity,
      });

      const subActionParams = {
        alerts: caseAlerts,
        rule: { id: rule.id, name: rule.name, tags: rule.tags, ruleUrl: ruleUrl ?? null },
        groupingBy: params.subActionParams.groupingBy,
        groupedAlerts,
        owner,
        reopenClosedCases: params.subActionParams.reopenClosedCases,
        timeWindow: params.subActionParams.timeWindow,
        maximumCasesToOpen: DEFAULT_MAX_OPEN_CASES,
        templateId: params.subActionParams.templateId,
        referencedAlerts,
      };

      return { subAction: 'run', subActionParams };
    },
    getKibanaPrivileges: ({ consumer, producer }) => {
      const owner = getOwnerFromRuleConsumerProducer({ consumer, producer, isServerlessSecurity });
      return constructRequiredKibanaPrivileges(owner);
    },
  };
};
