/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryMarkdown } from '@kbn/elastic-assistant-common';

import { AttackDiscoveryExpandedAlertsSchema } from './schema';
import type { CaseAlert, CasesGroupedAlerts } from '../types';

export const groupAttackDiscoveryAlerts = (alerts: CaseAlert[]): CasesGroupedAlerts[] => {
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
