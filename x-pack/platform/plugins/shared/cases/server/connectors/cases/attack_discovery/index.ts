/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryMarkdown } from '@kbn/elastic-assistant-common';

import { MAX_DOCS_PER_PAGE, MAX_TITLE_LENGTH } from '../../../../common/constants';
import { AttackDiscoveryExpandedAlertsSchema } from './schema';
import type { CaseAlert, CasesGroupedAlerts } from '../types';
import { MAX_OPEN_CASES } from '../constants';

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

  if (attackDiscoveryAlerts.length > MAX_OPEN_CASES) {
    throw new Error(
      `Circuit breaker: Attack discovery alerts grouping would create more than the maximum number of allowed cases ${MAX_OPEN_CASES}.`
    );
  }

  /**
   * For each attack discovery alert we would like to create one separate case.
   */
  const groupedAlerts = attackDiscoveryAlerts.map((attackAlert) => {
    const alertsIndexPattern = attackAlert.kibana.alert.rule.parameters.alertsIndexPattern;
    const attackDiscoveryId = attackAlert._id;
    const attackDiscovery = attackAlert.kibana.alert.attack_discovery;
    const alertIds = attackDiscovery.alert_ids;

    const caseTitle = attackDiscovery.title.slice(0, MAX_TITLE_LENGTH);
    const caseComments = [
      getAttackDiscoveryMarkdown({
        attackDiscovery: {
          id: attackDiscoveryId,
          alertIds,
          detailsMarkdown: attackDiscovery.details_markdown,
          entitySummaryMarkdown: attackDiscovery.entity_summary_markdown,
          mitreAttackTactics: attackDiscovery.mitre_attack_tactics,
          summaryMarkdown: attackDiscovery.summary_markdown,
          title: caseTitle,
        },
        replacements: attackDiscovery.replacements?.reduce((acc: Record<string, string>, r) => {
          acc[r.uuid] = r.value;
          return acc;
        }, {}),
      }),
    ].slice(0, MAX_DOCS_PER_PAGE / 2);

    /**
     * Each attack discovery alert references a list of SIEM alerts that led to the attack.
     * These SIEM alerts will be added to the case.
     */
    return {
      alerts: alertIds.map((siemAlertId) => ({ _id: siemAlertId, _index: alertsIndexPattern })),
      grouping: { attack_discovery: attackDiscoveryId },
      comments: caseComments,
      title: caseTitle,
    };
  });

  return groupedAlerts;
};
