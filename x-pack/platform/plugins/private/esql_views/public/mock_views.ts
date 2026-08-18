/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EsqlView {
  /** The view's name, which is also its unique identifier in Elasticsearch's `_query/view` API. */
  name: string;
  description: string;
  query: string;
  source: string;
  createdBy: string;
  lastUpdated: string;
}

// Seed rows shown alongside real, cluster-backed views for illustration purposes.
export const mockEsqlViews: EsqlView[] = [
  {
    name: 'failed-logins-24h',
    description: 'Authentication failures grouped by user and source IP.',
    query: 'FROM logs-* | WHERE event.outcome == "failure" | STATS count = COUNT() BY user.name',
    source: 'logs-*',
    createdBy: 'a.rivera',
    lastUpdated: '2026-07-14T09:12:00Z',
  },
  {
    name: 'slow-transactions-apm',
    description: 'APM transactions with duration above the p95 threshold.',
    query: 'FROM traces-apm* | WHERE transaction.duration.us > 500000 | SORT @timestamp DESC',
    source: 'traces-apm*',
    createdBy: 'j.kwon',
    lastUpdated: '2026-07-12T16:45:00Z',
  },
  {
    name: 'top-error-messages',
    description: 'Most frequent error messages across application logs.',
    query: 'FROM logs-apps-* | WHERE log.level == "error" | STATS count = COUNT() BY message',
    source: 'logs-apps-*',
    createdBy: 'a.rivera',
    lastUpdated: '2026-07-10T11:03:00Z',
  },
  {
    name: 'daily-active-hosts',
    description: 'Distinct host count per day for the fleet-metrics index.',
    query:
      'FROM metrics-fleet* | STATS hosts = COUNT_DISTINCT(host.name) BY day = BUCKET(@timestamp, 1 day)',
    source: 'metrics-fleet*',
    createdBy: 's.okafor',
    lastUpdated: '2026-07-09T08:30:00Z',
  },
  {
    name: 'suspicious-process-executions',
    description: 'Process events matching a small set of known-suspicious binaries.',
    query:
      'FROM logs-endpoint* | WHERE process.name IN ("powershell.exe", "certutil.exe") | KEEP @timestamp, host.name, process.command_line',
    source: 'logs-endpoint*',
    createdBy: 'm.alvarez',
    lastUpdated: '2026-07-08T14:20:00Z',
  },
  {
    name: 'ingest-volume-by-data-stream',
    description: 'Rolling document counts across all active data streams.',
    query: 'FROM *-* | STATS docs = COUNT() BY data_stream = _index',
    source: '*-*',
    createdBy: 's.okafor',
    lastUpdated: '2026-07-05T17:55:00Z',
  },
];
