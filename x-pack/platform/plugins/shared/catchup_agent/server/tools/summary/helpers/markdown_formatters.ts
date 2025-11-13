/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findRelatedAlerts,
  findRelatedCases,
  getSortedEntities,
  scoreEntities,
} from './entity_helpers';
import {
  collectCorrelatedSlackMessages,
  countCorrelatedSlackMessages,
  deduplicateMessages,
  extractMentionedEntities,
  filterCorrelationsByType,
  getCorrelationTypeDescriptions,
  prioritizeCorrelations,
} from './correlation_helpers';

/**
 * Format a Slack message for display
 */
export const formatSlackMessage = (msg: any, maxLength: number = 150): string => {
  const channel = msg.channel || 'unknown';
  const permalink = msg.permalink || '';
  const textPreview = (msg.text || msg.message || '').substring(0, maxLength).replace(/\n/g, ' ');
  const user = msg.user || msg.username || msg.user_name || '';
  const timestamp = msg.ts ? new Date(parseFloat(msg.ts) * 1000).toLocaleString() : '';

  let result = `- [${channel}](${permalink})`;
  if (user) result += ` by @${user}`;
  if (timestamp) result += ` (${timestamp})`;
  result += `\n`;
  result += `  "${textPreview}${textPreview.length >= maxLength ? '...' : ''}"\n`;
  return result;
};

/**
 * Format a case reference
 */
export const formatCaseReference = (caseItem: any, includeUrl: boolean = true): string => {
  const caseTitle = caseItem.title || caseItem.id || 'Unknown Case';
  const caseUrl = caseItem.url || '';
  if (includeUrl && caseUrl) {
    return `[${caseTitle}](${caseUrl})`;
  }
  return caseTitle;
};

/**
 * Format confidence percentage
 */
export const formatConfidence = (confidence?: number): string => {
  if (!confidence) return '';
  return ` (confidence: ${(confidence * 100).toFixed(0)}%)`;
};

/**
 * Build Security section
 */
export const buildSecuritySection = (
  security: any
): {
  items: string[];
  criticalAlertsSection: string;
  entitiesSection: string;
} => {
  const attackDiscoveries = security.attack_discoveries || security.attackDiscoveries;
  const detections = security.detections || {};
  const cases = security.cases || {};
  const ruleChanges = security.rule_changes || security.ruleChanges;

  const hasHighSeverityDetections =
    (detections?.detections_by_severity?.high || detections?.by_severity?.high || 0) > 0;
  const hasCriticalSeverityDetections =
    (detections?.detections_by_severity?.critical || detections?.by_severity?.critical || 0) > 0;
  const hasOpenCases =
    cases?.cases?.some((c: any) => c.status === 'open') ||
    cases?.values?.some((c: any) => c.status === 'open') ||
    false;
  const criticalCases = (cases?.cases || cases?.values || []).filter(
    (c: any) =>
      c.severity === 'critical' || c.severity === 'high' || (c.total_alerts && c.total_alerts > 10)
  );

  const sampleAlerts = detections?.sample_alerts || [];
  const entities = detections?.entities || {};
  const criticalAlerts = sampleAlerts.filter(
    (a: any) => a.severity === 'critical' || a.severity === 'high'
  );

  const securityItems: string[] = [];
  if (attackDiscoveries) {
    securityItems.push(`- **${attackDiscoveries.total || 0} new attack discoveries**`);
  }
  if (detections) {
    const detectionsText = `- **${
      detections.total || detections.detections_total || 0
    } detections** (${
      detections.detections_by_severity?.high || detections.by_severity?.high || 0
    } high, ${detections.detections_by_severity?.low || detections.by_severity?.low || 0} low)${
      hasHighSeverityDetections ? ' ⚠️' : ''
    }${hasCriticalSeverityDetections ? ' 🚨' : ''}`;
    securityItems.push(detectionsText);
  }
  if (cases) {
    securityItems.push(
      `- **${cases.total || 0} updated cases**${hasOpenCases ? ' (some open)' : ''}`
    );
  }
  if (criticalCases.length > 0) {
    securityItems.push(
      `- **${criticalCases.length} critical/high severity case(s)** requiring attention`
    );
  }
  if (ruleChanges) {
    securityItems.push(`- ${ruleChanges.total || 0} rule changes`);
  }

  // Build critical alerts section
  let criticalAlertsSection = '';
  if (criticalAlerts.length > 0) {
    criticalAlertsSection = `\n### Critical/High Severity Alerts\n*Top ${criticalAlerts.length} critical/high severity alerts with entity information:*\n\n`;
    criticalAlertsSection += criticalAlerts
      .map((alert: any, idx: number) => {
        const ruleName = alert['kibana.alert.rule.name'] || 'Unknown Rule';
        const severity = alert.severity || 'unknown';
        const reason = alert['kibana.alert.reason'] || '';
        const timestamp = alert['@timestamp'] ? new Date(alert['@timestamp']).toLocaleString() : '';
        const hostName = alert['host.name'] || '';
        const userName = alert['user.name'] || '';
        const sourceIp = alert['source.ip'] || '';
        const destIp = alert['destination.ip'] || '';
        const eventAction = alert['event.action'] || '';
        const eventCategory = alert['event.category'] || '';

        let alertText = `${idx + 1}. **${ruleName}** (${severity})\n`;
        if (reason) {
          alertText += `   - Reason: ${reason.substring(0, 200)}${
            reason.length > 200 ? '...' : ''
          }\n`;
        }
        if (hostName) alertText += `   - Host: ${hostName}\n`;
        if (userName) alertText += `   - User: ${userName}\n`;
        if (sourceIp) alertText += `   - Source IP: ${sourceIp}\n`;
        if (destIp) alertText += `   - Destination IP: ${destIp}\n`;
        if (eventAction || eventCategory) {
          alertText += `   - Event: ${eventCategory ? `${eventCategory}` : ''}${
            eventAction ? `/${eventAction}` : ''
          }\n`;
        }
        if (timestamp) alertText += `   - Time: ${timestamp}\n`;
        return alertText;
      })
      .join('\n');
  }

  // Build entities section from detections (legacy support)
  let entitiesSection = '';
  if (
    Object.keys(entities).length > 0 &&
    (entities.hosts?.length > 0 ||
      entities.users?.length > 0 ||
      entities.source_ips?.length > 0 ||
      entities.destination_ips?.length > 0)
  ) {
    entitiesSection = `\n### Entities Involved\n`;
    if (entities.hosts?.length > 0) {
      entitiesSection += `- **Hosts**: ${entities.hosts.join(', ')}${
        entities.hosts.length >= 10 ? ' (and more)' : ''
      }\n`;
    }
    if (entities.users?.length > 0) {
      entitiesSection += `- **Users**: ${entities.users.join(', ')}${
        entities.users.length >= 10 ? ' (and more)' : ''
      }\n`;
    }
    if (entities.source_ips?.length > 0) {
      entitiesSection += `- **Source IPs**: ${entities.source_ips.join(', ')}${
        entities.source_ips.length >= 10 ? ' (and more)' : ''
      }\n`;
    }
    if (entities.destination_ips?.length > 0) {
      entitiesSection += `- **Destination IPs**: ${entities.destination_ips.join(', ')}${
        entities.destination_ips.length >= 10 ? ' (and more)' : ''
      }\n`;
    }
  }

  return { items: securityItems, criticalAlertsSection, entitiesSection };
};

/**
 * Build Entities section with relationships
 */
export const buildEntitiesSection = (
  extractedEntities: any,
  entitiesData: any,
  relatedAlertsData: any,
  correlations: any[],
  cases: any,
  observability: any
): { entitySummarySection: string; extractedEntitiesSection: string } => {
  let extractedEntitiesSection = '';
  let entitySummarySection = '';
  const entities = entitiesData?.entities || entitiesData || {};
  const relatedAlerts = relatedAlertsData?.alerts || relatedAlertsData?.data?.alerts || [];

  if (
    entities &&
    (entities.host_names?.length > 0 ||
      entities.service_names?.length > 0 ||
      entities.user_names?.length > 0 ||
      entities.source_ips?.length > 0 ||
      entities.destination_ips?.length > 0)
  ) {
    // Build entity summary section
    const totalEntities =
      (entities.host_names?.length || 0) +
      (entities.service_names?.length || 0) +
      (entities.user_names?.length || 0) +
      (entities.source_ips?.length || 0) +
      (entities.destination_ips?.length || 0);

    if (totalEntities > 0) {
      entitySummarySection = `\n## Key Entities\n`;
      entitySummarySection += `*Most important entities extracted from the incident (prioritized by correlation frequency):*\n\n`;

      const entityScores = scoreEntities(entities, correlations, relatedAlerts);

      const sortedHosts = getSortedEntities(entities.host_names || [], entityScores, 'host', 5);
      const sortedServices = getSortedEntities(
        entities.service_names || [],
        entityScores,
        'service',
        3
      );
      const sortedUsers = getSortedEntities(entities.user_names || [], entityScores, 'user', 3);

      if (sortedHosts.length > 0) {
        entitySummarySection += `### Hosts (${sortedHosts.length} most relevant)\n`;
        for (const { name } of sortedHosts) {
          entitySummarySection += `- \`host.name\`: "${name}"\n`;
        }
        entitySummarySection += '\n';
      }

      if (sortedServices.length > 0) {
        entitySummarySection += `### Services (${sortedServices.length} most relevant)\n`;
        for (const { name } of sortedServices) {
          entitySummarySection += `- \`service.name\`: "${name}"\n`;
        }
        entitySummarySection += '\n';
      }

      if (sortedUsers.length > 0) {
        entitySummarySection += `### Users (${sortedUsers.length} most relevant)\n`;
        for (const { name } of sortedUsers) {
          entitySummarySection += `- \`user.name\`: "${name}"\n`;
        }
        entitySummarySection += '\n';
      }

      if (entities.source_ips?.length > 0 && entities.source_ips.length <= 5) {
        entitySummarySection += `### Source IPs\n`;
        for (const sourceIp of entities.source_ips.slice(0, 5)) {
          entitySummarySection += `- \`source.ip\`: "${sourceIp}"\n`;
        }
        entitySummarySection += '\n';
      }

      if (entities.destination_ips?.length > 0 && entities.destination_ips.length <= 5) {
        entitySummarySection += `### Destination Addresses\n`;
        for (const destIp of entities.destination_ips.slice(0, 5)) {
          entitySummarySection += `- \`destination.address\`: "${destIp}"\n`;
        }
        entitySummarySection += '\n';
      }
    }

    extractedEntitiesSection = `\n## Extracted Entities and Relationships\n`;
    extractedEntitiesSection += `*Entities extracted from the incident and their relationships to security/observability cases and alerts:*\n\n`;

    const allCases = cases?.cases || cases?.values || [];

    // Extract observability cases
    let observabilityCases: any[] = [];
    if (observability?.observability_summary?.cases) {
      const obsCasesData = observability.observability_summary.cases;
      if (Array.isArray(obsCasesData)) {
        observabilityCases = obsCasesData;
      } else if (obsCasesData?.cases && Array.isArray(obsCasesData.cases)) {
        observabilityCases = obsCasesData.cases;
      } else if (obsCasesData?.values && Array.isArray(obsCasesData.values)) {
        observabilityCases = obsCasesData.values;
      }
    } else if (observability?.cases) {
      if (Array.isArray(observability.cases)) {
        observabilityCases = observability.cases;
      } else if (observability.cases?.cases && Array.isArray(observability.cases.cases)) {
        observabilityCases = observability.cases.cases;
      } else if (observability.cases?.values && Array.isArray(observability.cases.values)) {
        observabilityCases = observability.cases.values;
      }
    }

    const allObservabilityCases = [...allCases, ...observabilityCases];

    // Format entity sections
    extractedEntitiesSection += formatEntityTypeSection(
      'Host Names',
      entities.host_names || [],
      'host',
      relatedAlerts,
      allObservabilityCases
    );
    extractedEntitiesSection += formatEntityTypeSection(
      'Service Names',
      entities.service_names || [],
      'service',
      relatedAlerts,
      allObservabilityCases
    );
    extractedEntitiesSection += formatEntityTypeSection(
      'User Names',
      entities.user_names || [],
      'user',
      relatedAlerts,
      allObservabilityCases
    );
  }

  return { entitySummarySection, extractedEntitiesSection };
};

/**
 * Format a section for a specific entity type
 */
const formatEntityTypeSection = (
  title: string,
  entities: string[],
  entityType: 'host' | 'service' | 'user',
  relatedAlerts: any[],
  allCases: any[]
): string => {
  if (entities.length === 0) return '';

  let section = `### ${title}\n`;
  for (const entityName of entities.slice(0, 10)) {
    const entityAlerts = findRelatedAlerts(entityName, entityType, relatedAlerts);
    const entityCases = findRelatedCases(entityName, allCases);

    section += `- **${entityName}**\n`;
    if (entityAlerts.length > 0) {
      section += `  - Related Alerts: ${entityAlerts.length} alert(s) found\n`;
      for (const alert of entityAlerts.slice(0, 3)) {
        const severity = alert.severity || 'unknown';
        const ruleName = alert.rule?.name || 'Unknown Rule';
        section += `    - Alert ID: ${alert.id || 'unknown'} (${severity}) - ${ruleName}\n`;
      }
    }
    if (entityCases.length > 0) {
      section += `  - Related Cases: ${entityCases.length} case(s) found\n`;
      for (const caseItem of entityCases.slice(0, 3)) {
        const caseTitle = formatCaseReference(caseItem);
        section += `    - ${caseTitle}\n`;
      }
    }
    if (entityAlerts.length === 0 && entityCases.length === 0) {
      section += `  - No related alerts or cases found\n`;
    }
  }
  if (entities.length > 10) {
    section += `- ... and ${entities.length - 10} more ${entityType}(s)\n`;
  }
  section += '\n';
  return section;
};

/**
 * Build Observability section
 */
export const buildObservabilitySection = (observability: any): string => {
  const obsSummary = observability?.observability_summary || observability || {};
  const obsAlerts = obsSummary.alerts || {};
  const obsCases = obsSummary.cases || {};
  const obsCasesList = Array.isArray(obsCases) ? obsCases : obsCases.cases || obsCases.values || [];

  const hasAlerts =
    obsAlerts.total_alerts ||
    obsAlerts.open_alerts ||
    obsAlerts.resolved_alerts ||
    obsAlerts.top_services;
  const hasCases = obsCasesList.length > 0;

  if (!hasAlerts && !hasCases) return '';

  let obsSection = `## Observability\n`;

  if (hasAlerts) {
    obsSection += `${obsAlerts.total_alerts ? `- ${obsAlerts.total_alerts} total alerts` : ''}\n`;
    obsSection += `${obsAlerts.open_alerts ? `- ${obsAlerts.open_alerts} open alerts` : ''}\n`;
    obsSection += `${
      obsAlerts.resolved_alerts ? `- ${obsAlerts.resolved_alerts} resolved alerts` : ''
    }\n`;
    obsSection += `${
      obsAlerts.top_services ? `- Top services: ${obsAlerts.top_services.join(', ')}` : ''
    }\n`;
  }

  if (hasCases) {
    obsSection += `- **${obsCasesList.length} observability case(s)**\n`;
    for (const caseItem of obsCasesList.slice(0, 5)) {
      const caseTitle = formatCaseReference(caseItem);
      const severity = caseItem.severity || 'unknown';
      const status = caseItem.status || 'unknown';
      obsSection += `  - ${caseTitle} (${status}, ${severity})\n`;
    }
    if (obsCasesList.length > 5) {
      obsSection += `  - ... and ${obsCasesList.length - 5} more case(s)\n`;
    }
  }

  obsSection += '\n';
  return obsSection;
};

/**
 * Build Search section
 */
export const buildSearchSection = (search: any): string => {
  if (!search.total_queries && !search.avg_ctr) return '';

  return `## Search
${search.total_queries ? `- ${search.total_queries} queries` : ''}
${search.avg_ctr ? `- Average CTR: ${search.avg_ctr.toFixed(2)}%` : ''}

`;
};

/**
 * Build External Context section
 */
export const buildExternalSection = (external: any, correlations: any[]): string => {
  const userMentions = external.slack?.userMentionMessages?.length || 0;
  const channelMessages = external.slack?.channelMessages?.length || 0;
  const dmMessages = external.slack?.dmMessages?.length || 0;
  const total = userMentions + channelMessages + dmMessages;
  const hasSlack = total > 0;
  const hasGithub = external.github?.pull_requests?.length > 0;
  const hasGmail = external.gmail?.emails?.length > 0;

  if (!hasSlack && !hasGithub && !hasGmail) return '';

  const correlatedSlackCount = countCorrelatedSlackMessages(correlations);
  const correlatedSlackMessages = collectCorrelatedSlackMessages(correlations);

  let slackSection = '';

  if (hasSlack) {
    slackSection += `- **Slack**: ${total} messages (${userMentions} mentions, ${channelMessages} channel, ${dmMessages} DMs)`;
    if (correlatedSlackCount > 0) {
      slackSection += ` - **${correlatedSlackCount} message(s) linked to security cases/alerts**`;
    }
    slackSection += '\n';

    if (correlatedSlackMessages.length > 0) {
      slackSection += `  \n  **Messages discussing security cases/alerts:**\n`;
      const uniqueMessages = deduplicateMessages(correlatedSlackMessages);
      for (const msg of uniqueMessages.slice(0, 5)) {
        slackSection += formatSlackMessage(msg, 200);
      }
      if (uniqueMessages.length > 5) {
        slackSection += `  - ... and ${uniqueMessages.length - 5} more message(s)\n`;
      }
    } else {
      slackSection += `  \n  *No Slack messages were found to be directly linked to security cases or alerts in this time period.*\n`;
    }
  }

  return `## External Context
${hasGithub ? `- **GitHub**: ${external.github.pull_requests.length} PRs` : ''}
${slackSection}
${hasGmail ? `- **Gmail**: ${external.gmail.emails.length} emails` : ''}

`;
};

/**
 * Build Correlations section
 */
export const buildCorrelationsSection = (correlations: any[], cases: any): string => {
  if (correlations.length === 0) {
    return '- No correlations found';
  }

  let correlationText = `- **${correlations.length} correlated events found**\n\n`;

  // Group correlations by type
  const obsCaseCorrelations = filterCorrelationsByType(correlations, [
    'entity_host_observability',
    'entity_service_observability',
  ]).filter((c: any) => c.observability);

  const attackDiscoveryCorrelations = filterCorrelationsByType(correlations, [
    'entity_host_attack_discovery',
    'entity_service_attack_discovery',
  ]).filter((c: any) => c.observability);

  // Show observability case correlations
  if (obsCaseCorrelations.length > 0) {
    correlationText += `### Linked Observability Cases\n`;
    correlationText += `*Observability cases linked to incident entities:*\n\n`;
    for (const corr of obsCaseCorrelations.slice(0, 10)) {
      const obsCase = corr.observability;
      if (obsCase) {
        const caseTitle = obsCase.title || corr.title || 'Unknown Case';
        const caseUrl = obsCase.url || '';
        const severity = obsCase.severity || corr.severity || 'unknown';
        const status = obsCase.status || corr.status || 'unknown';
        const confidence = formatConfidence(corr.confidence);

        correlationText += `- **[${caseTitle}](${caseUrl})**${confidence}\n`;
        correlationText += `  - Status: ${status} | Severity: ${severity}\n`;
        if (corr.service) {
          correlationText += `  - Linked via: ${corr.service}\n`;
        }
        correlationText += '\n';
      }
    }
    if (obsCaseCorrelations.length > 10) {
      correlationText += `- ... and ${
        obsCaseCorrelations.length - 10
      } more observability case(s)\n\n`;
    }
  }

  // Show attack discovery correlations
  if (attackDiscoveryCorrelations.length > 0) {
    correlationText += `### Related Attack Discoveries\n`;
    correlationText += `*Attack discoveries linked to incident entities:*\n\n`;
    for (const corr of attackDiscoveryCorrelations.slice(0, 10)) {
      const attack = corr.observability;
      if (attack) {
        const attackTitle = attack.title || corr.title || 'Unknown Attack Discovery';
        const attackUrl = attack.url || '';
        const severity = attack.severity || corr.severity || 'unknown';
        const confidence = formatConfidence(corr.confidence);

        correlationText += `- **[${attackTitle}](${attackUrl})**${confidence}\n`;
        correlationText += `  - Severity: ${severity}\n`;
        if (corr.service) {
          correlationText += `  - Linked via: ${corr.service}\n`;
        }
        correlationText += '\n';
      }
    }
    if (attackDiscoveryCorrelations.length > 10) {
      correlationText += `- ... and ${
        attackDiscoveryCorrelations.length - 10
      } more attack discovery/discoveries\n\n`;
    }
  }

  // Format other correlation types
  correlationText += formatSlackCaseCorrelations(correlations, cases);
  correlationText += formatSlackAlertCorrelations(correlations, cases);
  correlationText += formatSlackAttackCorrelations(correlations, cases);
  correlationText += formatCaseAlertCorrelations(correlations, cases);
  correlationText += formatServiceCorrelations(correlations);
  correlationText += formatAlertServiceCorrelations(correlations);
  correlationText += formatEntityAlertCorrelations(correlations);

  // Add correlation summary
  const { mentionedServices, mentionedCases, mentionedAlerts } =
    extractMentionedEntities(correlations);
  correlationText += formatCorrelationSummary(
    correlations,
    mentionedServices,
    mentionedCases,
    mentionedAlerts,
    cases
  );

  return correlationText;
};

/**
 * Format Slack case correlations
 */
const formatSlackCaseCorrelations = (correlations: any[], cases: any): string => {
  const slackCaseCorrelations = filterCorrelationsByType(correlations, ['slack_case_url']).filter(
    (c: any) => c.case && c.slack
  );

  if (slackCaseCorrelations.length === 0) return '';

  let text = `### Slack Messages Linked to Cases\n`;
  for (const corr of slackCaseCorrelations) {
    const caseId = corr.case;
    const caseData =
      cases.cases?.find((c: any) => c.id === caseId) ||
      cases.values?.find((c: any) => c.id === caseId);
    const caseTitle = corr.title || caseData?.title || caseId;
    const caseDescription = corr.description || caseData?.description || '';
    const caseUrl = caseData?.url || '';
    const severity = corr.severity || caseData?.severity || '';
    const status = corr.status || caseData?.status || '';
    const confidence = formatConfidence(corr.confidence);
    const slackMessages = corr.slack || [];

    text += `- **Case**: [${caseTitle}](${caseUrl})${confidence}\n`;
    if (caseDescription) {
      text += `  - Description: ${caseDescription.substring(0, 200)}${
        caseDescription.length > 200 ? '...' : ''
      }\n`;
    }
    if (severity || status) {
      text += `  - Status: ${status || 'unknown'} | Severity: ${severity || 'unknown'}\n`;
    }
    text += `  - **Slack Messages** (${slackMessages.length}):\n`;
    for (const msg of slackMessages) {
      text += formatSlackMessage(msg, 150);
    }
    text += '\n';
  }
  return text;
};

/**
 * Format Slack alert correlations
 */
const formatSlackAlertCorrelations = (correlations: any[], cases: any): string => {
  const slackAlertCorrelations = filterCorrelationsByType(correlations, ['slack_alert_url']).filter(
    (c: any) => c.alert && c.slack
  );

  if (slackAlertCorrelations.length === 0) return '';

  let text = `### Slack Messages Linked to Alerts\n`;
  for (const corr of slackAlertCorrelations) {
    const alertId = corr.alert;
    const caseId = corr.case;
    const caseData = caseId
      ? cases.cases?.find((c: any) => c.id === caseId) ||
        cases.values?.find((c: any) => c.id === caseId)
      : null;
    const caseTitle = corr.title || caseData?.title || caseId || 'Unknown Case';
    const caseUrl = caseData?.url || '';
    const confidence = formatConfidence(corr.confidence);
    const slackMessages = corr.slack || [];

    text += `- **Alert**: ${alertId}${confidence}\n`;
    if (caseId && caseData) {
      text += `  - **Case**: [${caseTitle}](${caseUrl})\n`;
    }
    text += `  - **Slack Messages** (${slackMessages.length}):\n`;
    for (const msg of slackMessages) {
      text += formatSlackMessage(msg, 150);
    }
    text += '\n';
  }
  return text;
};

/**
 * Format Slack attack discovery correlations
 */
const formatSlackAttackCorrelations = (correlations: any[], cases: any): string => {
  const slackAttackCorrelations = filterCorrelationsByType(correlations, [
    'slack_attack_discovery_url',
  ]).filter((c: any) => c.slack);

  if (slackAttackCorrelations.length === 0) return '';

  let text = `### Slack Messages Linked to Attack Discoveries\n`;
  for (const corr of slackAttackCorrelations) {
    const attackTitle = corr.title || 'Unknown Attack Discovery';
    const caseId = corr.case;
    const caseData = caseId
      ? cases.cases?.find((c: any) => c.id === caseId) ||
        cases.values?.find((c: any) => c.id === caseId)
      : null;
    const confidence = formatConfidence(corr.confidence);
    const slackMessages = corr.slack || [];

    text += `- **Attack Discovery**: ${attackTitle}${confidence}\n`;
    if (caseId && caseData) {
      text += `  - **Related Case**: [${caseData.title}](${caseData.url || ''})\n`;
    }
    text += `  - **Slack Messages** (${slackMessages.length}):\n`;
    for (const msg of slackMessages) {
      text += formatSlackMessage(msg, 150);
    }
    text += '\n';
  }
  return text;
};

/**
 * Format case-alert correlations
 */
const formatCaseAlertCorrelations = (correlations: any[], cases: any): string => {
  const caseAlertCorrelations = filterCorrelationsByType(correlations, ['exact_case_alert']).filter(
    (c: any) => c.case
  );

  if (caseAlertCorrelations.length === 0) return '';

  const slackCaseCorrelations = filterCorrelationsByType(correlations, ['slack_case_url']).filter(
    (c: any) => c.case && c.slack
  );
  const slackAlertCorrelations = filterCorrelationsByType(correlations, ['slack_alert_url']).filter(
    (c: any) => c.alert && c.slack
  );

  let text = `### Cases with Linked Alerts\n`;
  text += `*These cases have alerts directly linked to them, indicating active security incidents.*\n\n`;

  for (const corr of caseAlertCorrelations) {
    const caseId = corr.case;
    const caseData =
      cases.cases?.find((c: any) => c.id === caseId) ||
      cases.values?.find((c: any) => c.id === caseId);
    const caseTitle = corr.title || caseData?.title || caseId;
    const caseDescription = corr.description || caseData?.description || '';
    const caseUrl = caseData?.url || '';
    const severity = corr.severity || caseData?.severity || '';
    const status = corr.status || caseData?.status || '';
    const alertCount = caseData?.total_alerts || 0;
    const confidence = formatConfidence(corr.confidence);
    const createdAt = caseData?.created_at || '';
    const updatedAt = caseData?.updated_at || caseData?.updatedAt || '';

    const relatedSlackMessages = [
      ...slackCaseCorrelations
        .filter((c: any) => c.case === caseId)
        .flatMap((c: any) => c.slack || []),
      ...slackAlertCorrelations
        .filter((c: any) => c.case === caseId)
        .flatMap((c: any) => c.slack || []),
    ];

    text += `- **[${caseTitle}](${caseUrl})**${confidence}\n`;
    if (caseDescription) {
      text += `  - Description: ${caseDescription.substring(0, 200)}${
        caseDescription.length > 200 ? '...' : ''
      }\n`;
    }
    if (severity || status) {
      text += `  - Status: ${status || 'unknown'} | Severity: ${severity || 'unknown'}\n`;
    }
    text += `  - Linked Alerts: ${alertCount} alert(s)\n`;
    if (corr.alert && corr.alert !== 'linked_alerts') {
      text += `  - Alert ID: ${corr.alert}\n`;
    }

    if (relatedSlackMessages.length > 0) {
      text += `  - **Discussed in Slack** (${relatedSlackMessages.length} message(s)):\n`;
      for (const msg of relatedSlackMessages.slice(0, 3)) {
        const channel = msg.channel || 'unknown';
        const permalink = msg.permalink || '';
        const textPreview = (msg.text || msg.message || '').substring(0, 120).replace(/\n/g, ' ');
        const user = msg.user || msg.username || '';
        text += `    - [${channel}](${permalink})${user ? ` by @${user}` : ''} - "${textPreview}${
          textPreview.length >= 120 ? '...' : ''
        }"\n`;
      }
      if (relatedSlackMessages.length > 3) {
        text += `    - ... and ${relatedSlackMessages.length - 3} more message(s)\n`;
      }
    }

    if (createdAt || updatedAt) {
      const dateInfo = updatedAt
        ? `Last updated: ${new Date(updatedAt).toLocaleString()}`
        : createdAt
        ? `Created: ${new Date(createdAt).toLocaleString()}`
        : '';
      if (dateInfo) {
        text += `  - ${dateInfo}\n`;
      }
    }
    text += '\n';
  }
  return text;
};

/**
 * Format service correlations
 */
const formatServiceCorrelations = (correlations: any[]): string => {
  const serviceCorrelations = filterCorrelationsByType(correlations, ['entity_service']).filter(
    (c: any) => c.service
  );

  if (serviceCorrelations.length === 0) return '';

  let text = `### Service-Related Correlations\n`;
  for (const corr of serviceCorrelations) {
    const serviceName = corr.service;
    const confidence = formatConfidence(corr.confidence);
    text += `- **Service: ${serviceName}**${confidence}\n`;

    if (corr.github && corr.github.length > 0) {
      text += `  - **GitHub PRs** (${corr.github.length}):\n`;
      for (const pr of corr.github.slice(0, 3)) {
        const prTitle = pr.title || 'Untitled PR';
        const prUrl = pr.html_url || pr.url || '';
        const prBody = (pr.body || '').substring(0, 150);
        text += `    - [${prTitle}](${prUrl})${
          prBody ? ` - ${prBody}${prBody.length >= 150 ? '...' : ''}` : ''
        }\n`;
      }
    }

    if (corr.slack && corr.slack.length > 0) {
      text += `  - **Slack Messages** (${corr.slack.length}):\n`;
      for (const msg of corr.slack.slice(0, 3)) {
        text += formatSlackMessage(msg, 100);
      }
    }
    text += '\n';
  }
  return text;
};

/**
 * Format alert-service correlations
 */
const formatAlertServiceCorrelations = (correlations: any[]): string => {
  const alertServiceCorrelations = correlations.filter(
    (c: any) => c.alert && c.service && c.github
  );

  if (alertServiceCorrelations.length === 0) return '';

  let text = `### Alerts Linked to Services and GitHub\n`;
  for (const corr of alertServiceCorrelations) {
    const alertId = corr.alert;
    const serviceName = corr.service;
    text += `- **Alert**: ${alertId} | **Service**: ${serviceName}\n`;

    if (corr.github && corr.github.length > 0) {
      text += `  - **Related PRs**:\n`;
      for (const pr of corr.github.slice(0, 2)) {
        const prTitle = pr.title || 'Untitled PR';
        const prUrl = pr.html_url || pr.url || '';
        text += `    - [${prTitle}](${prUrl})\n`;
      }
    }
    text += '\n';
  }
  return text;
};

/**
 * Format entity-alert correlations
 */
const formatEntityAlertCorrelations = (correlations: any[]): string => {
  const entityAlertCorrelations = filterCorrelationsByType(correlations, [
    'entity_alert_id',
  ]).filter((c: any) => c.alert);

  if (entityAlertCorrelations.length === 0) return '';

  let text = `### Alerts Mentioned in Slack\n`;
  for (const corr of entityAlertCorrelations) {
    const alertId = corr.alert;
    const confidence = formatConfidence(corr.confidence);
    text += `- **Alert**: ${alertId}${confidence}\n`;

    if (corr.slack && corr.slack.length > 0) {
      text += `  - **Slack Messages** (${corr.slack.length}):\n`;
      for (const msg of corr.slack.slice(0, 3)) {
        text += formatSlackMessage(msg, 100);
      }
    }
    text += '\n';
  }
  return text;
};

/**
 * Format correlation summary
 */
const formatCorrelationSummary = (
  correlations: any[],
  mentionedServices: Set<string>,
  mentionedCases: Set<string>,
  mentionedAlerts: Set<string>,
  cases: any
): string => {
  if (correlations.length === 0) return '';

  const correlationTypes = new Set(correlations.map((c: any) => c.match_type || 'unknown'));
  const typeDescriptions = getCorrelationTypeDescriptions();

  let text = `\n### Correlation Summary\n`;
  text += `- **Total correlations**: ${correlations.length}\n`;

  if (correlationTypes.size > 0) {
    const typeList = Array.from(correlationTypes)
      .map((type: string) => {
        const description = typeDescriptions[type] || type;
        return `${type} (${description})`;
      })
      .join(', ');
    text += `- **Correlation types**: ${typeList}\n`;
  }

  if (mentionedCases.size > 0) {
    const caseTitles = Array.from(mentionedCases)
      .map((caseId: string) => {
        const caseData =
          cases.cases?.find((c: any) => c.id === caseId) ||
          cases.values?.find((c: any) => c.id === caseId);
        if (caseData) {
          return formatCaseReference(caseData);
        }
        return caseId;
      })
      .slice(0, 5);
    text += `- **Cases found**: ${caseTitles.join(', ')}${
      mentionedCases.size > 5 ? ` (and ${mentionedCases.size - 5} more)` : ''
    }\n`;
  }

  if (mentionedAlerts.size > 0) {
    text += `- **Alerts mentioned**: ${mentionedAlerts.size} alert(s)\n`;
  }

  if (mentionedServices.size > 0) {
    text += `- **Services mentioned**: ${Array.from(mentionedServices).join(', ')}\n`;
  }

  const slackMessageCount = correlations.reduce((count: number, corr: any) => {
    return count + (corr.slack?.length || 0);
  }, 0);
  if (slackMessageCount > 0) {
    text += `- **Slack discussions**: ${slackMessageCount} message(s) linked to security events\n`;
  }

  const avgConfidence =
    correlations
      .filter((c: any) => c.confidence)
      .reduce((sum: number, c: any) => sum + (c.confidence || 0), 0) /
    correlations.filter((c: any) => c.confidence).length;
  if (avgConfidence > 0 && !isNaN(avgConfidence)) {
    text += `- **Average confidence**: ${(avgConfidence * 100).toFixed(0)}%\n`;
  }

  return text;
};

/**
 * Build Recommendations section
 */
export const buildRecommendationsSection = (correlations: any[], relatedAlerts: any[]): string => {
  if (correlations.length === 0) {
    return '*No correlations found. Continue standard investigation procedures.*\n';
  }

  const recommendations: string[] = [];

  const obsCorrelations = filterCorrelationsByType(correlations, [
    'entity_host_observability',
    'entity_service_observability',
  ]);
  const attackCorrelations = filterCorrelationsByType(correlations, [
    'entity_host_attack_discovery',
    'entity_service_attack_discovery',
  ]);
  const criticalCorrelations = correlations.filter(
    (c: any) => c.severity === 'critical' || c.severity === 'high'
  );
  const prioritizedCorrelations = prioritizeCorrelations(correlations, 10);

  if (obsCorrelations.length > 0) {
    recommendations.push(
      `🔍 **Review ${obsCorrelations.length} linked observability case(s)**: These cases may provide additional context about infrastructure issues related to this incident.`
    );
  }

  if (attackCorrelations.length > 0) {
    recommendations.push(
      `⚠️ **Investigate ${attackCorrelations.length} related attack discovery/discoveries**: These may indicate broader security implications beyond the initial incident.`
    );
  }

  if (criticalCorrelations.length > 0) {
    recommendations.push(
      `🚨 **Priority: ${criticalCorrelations.length} critical/high severity case(s) require immediate attention**. Review these cases first.`
    );
  }

  const uniqueHosts = new Set<string>();
  prioritizedCorrelations.forEach((c: any) => {
    if (c.service && (c.service.includes('payment') || c.service.includes('prod'))) {
      uniqueHosts.add(c.service);
    }
  });
  if (uniqueHosts.size > 1) {
    recommendations.push(
      `🌐 **Multi-host incident detected**: ${uniqueHosts.size} different hosts are involved. This may indicate a coordinated attack or widespread issue.`
    );
  }

  const openCases = correlations.filter((c: any) => c.status === 'open');
  if (openCases.length > 0) {
    recommendations.push(
      `📋 **${openCases.length} open case(s) need resolution**: Review and update case status as investigation progresses.`
    );
  }

  if (relatedAlerts && Array.isArray(relatedAlerts) && relatedAlerts.length > 0) {
    const highSeverityAlerts = relatedAlerts.filter(
      (a: any) => a.severity === 'critical' || a.severity === 'high'
    );
    if (highSeverityAlerts.length > 0) {
      recommendations.push(
        `🚨 **${highSeverityAlerts.length} high/critical severity alert(s) found**: Review these alerts for immediate threats.`
      );
    }
  }

  if (recommendations.length === 0 && correlations.length > 0) {
    recommendations.push(
      `📊 **Review ${prioritizedCorrelations.length} prioritized correlation(s)**: These correlations have been ranked by relevance and severity.`
    );
  }

  if (recommendations.length === 0) {
    return '*No specific recommendations at this time. Continue monitoring the incident.*\n';
  }

  return (
    recommendations.map((rec: string, idx: number) => `${idx + 1}. ${rec}`).join('\n\n') + '\n'
  );
};
