/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

export const OBSERVABILITY_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';

export async function indexObservabilityAlertDocument(
  esClient: Client,
  params: {
    alertId: string;
    serviceName: string;
    environment: string;
    startIso: string;
    endIso: string;
  }
): Promise<void> {
  await esClient.index({
    index: OBSERVABILITY_ALERTS_INDEX,
    id: params.alertId,
    op_type: 'create',
    refresh: 'wait_for',
    document: {
      '@timestamp': params.endIso,
      'event.action': 'active',
      'event.kind': 'signal',
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.duration.us': 120_000_000,
      'kibana.alert.evaluation.threshold': 1000,
      'kibana.alert.evaluation.value': 5000,
      'kibana.alert.instance.id': params.serviceName,
      'kibana.alert.uuid': params.alertId,
      'kibana.alert.reason': `Latency is above threshold for ${params.serviceName}`,
      'kibana.alert.rule.category': 'Transaction duration threshold',
      'kibana.alert.rule.consumer': 'alerts',
      'kibana.alert.rule.producer': 'apm',
      'kibana.alert.rule.rule_type_id': 'apm.transaction_duration',
      'kibana.alert.rule.name': 'APM Transaction Duration',
      'kibana.alert.rule.uuid': '521bd1a0-30ed-11ec-9819-c5cd0facebad',
      'kibana.alert.start': params.startIso,
      'kibana.alert.end': params.endIso,
      'kibana.alert.time_range': { gte: params.startIso, lte: params.endIso },
      'kibana.space_ids': ['default'],
      'kibana.version': '8.0.0',
      'processor.event': 'transaction',
      'service.environment': params.environment,
      'service.name': params.serviceName,
      'transaction.type': 'request',
      tags: [],
    },
  });
}

export async function deleteObservabilityAlertDocument(
  esClient: Client,
  alertId: string
): Promise<void> {
  await esClient.deleteByQuery({
    index: `${OBSERVABILITY_ALERTS_INDEX}*`,
    query: { term: { 'kibana.alert.uuid': alertId } },
    conflicts: 'proceed',
    refresh: true,
    ignore_unavailable: true,
  });
}
