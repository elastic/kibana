/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntityIndexPattern } from '../../../../common/domain/entity_index';
import {
  getExtractionRunsDataStreamName,
  getSystemEventsDataStreamName,
  getSystemEventsDashboardId,
} from '../../../../common/domain/system_events';
import { SYSTEM_EVENT_ACTION } from '../types';
import {
  STATUS_COLOR,
  markdownPanel,
  metricPanel,
  tablePanel,
  thresholdPalette,
  xyPanel,
} from './esql_panels';

/** Bump when the dashboard changes. Installed dashboards with a lower version are overwritten. */
export const SYSTEM_EVENTS_DASHBOARD_VERSION = 2;

// Pin the dashboard SO past the legacy embeddable migrations, as the Agent Builder and
// inference dashboards do.
const CORE_MIGRATION_VERSION = '8.8.0';
const DASHBOARD_TYPE_MIGRATION_VERSION = '10.3.0';

const SECTION = {
  attention: 'entity-store-attention',
  extraction: 'entity-store-extraction-3d',
  extractionTrend: 'entity-store-extraction-30d',
  snapshotAndMaintainers: 'entity-store-snapshot-maintainers-30d',
  changes: 'entity-store-engine-changes',
  details: 'entity-store-details',
} as const;

// Panels follow the dashboard time picker (30 days by default). Raw extraction runs exist for
// up to 4 days only, so their panels show that much at most.
const IN_RANGE = 'WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
const AUTO_BUCKET = 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

// Raw extraction runs exist for up to 4 days, so these panels show the last 3 days whatever the
// dashboard time picker says.
const LAST_3_DAYS = { from: 'now-3d', to: 'now' };
const LAST_24_HOURS = { from: 'now-24h', to: 'now' };
// The events stream keeps 30 days (plus up to 7 more).
const LAST_30_DAYS = { from: 'now-30d', to: 'now' };

const NO_VALUE = '—';

/** Time since `field` as text, such as "12 min ago", "5 h ago" or "3 days ago". */
const relative = (field: string) =>
  `CASE(${field} IS NULL, "${NO_VALUE}", DATE_DIFF("minute", ${field}, NOW()) < 120, CONCAT(TO_STRING(DATE_DIFF("minute", ${field}, NOW())), " min ago"), DATE_DIFF("hour", ${field}, NOW()) < 48, CONCAT(TO_STRING(DATE_DIFF("hour", ${field}, NOW())), " h ago"), CONCAT(TO_STRING(DATE_DIFF("day", ${field}, NOW())), " days ago"))`;

/** Time since `field` and the exact UTC time, such as "12 min ago · 2026-11-17 08:16 UTC". */
const when = (field: string) =>
  `CASE(${field} IS NULL, "${NO_VALUE}", CONCAT(${relative(
    field
  )}, " · ", DATE_FORMAT("yyyy-MM-dd HH:mm", ${field}), " UTC"))`;

/** The task a run doc belongs to, as text. */
const TASK_LABEL = `CASE(event.action == "maintainer", CONCAT("maintainer: ", entity_store.maintainer_id), event.action == "extraction", CONCAT("extraction: ", entity_store.entity_type, " · ", entity_store.mode), event.action)`;

/** The reason (when there is one) and the error of a failed run. */
const FAILURE_TEXT = `CASE(event.reason IS NOT NULL AND error.message IS NOT NULL, CONCAT(event.reason, ": ", error.message), error.message IS NOT NULL, error.message, event.reason IS NOT NULL, event.reason, "${NO_VALUE}")`;

/** What a lifecycle doc acted on: a maintainer, or an entity type (and process). */
const LIFECYCLE_TARGET = `COALESCE(entity_store.maintainer_id, CONCAT(entity_store.entity_type, COALESCE(CONCAT(" · ", entity_store.mode), "")))`;

/** A lifecycle doc as a task name, such as "lifecycle: start_process user · nonPriority". */
const LIFECYCLE_LABEL = `CONCAT("lifecycle: ", event.action, COALESCE(CONCAT(" ", ${LIFECYCLE_TARGET}), ""))`;

const SECONDS = 'event.duration / 1000000000.0';

const gridIn =
  (sectionId?: string) =>
  (
    x: number,
    y: number,
    w: number,
    h: number
  ): { x: number; y: number; w: number; h: number } & {
    sectionId?: string;
  } => ({ x, y, w, h, ...(sectionId ? { sectionId } : {}) });

/**
 * One row per task, with the time of its last failure and last success in the range. With
 * `includeLifecycle`, engine changes count as tasks too, so a later success clears a failed one.
 */
const perTaskStatus = (runStreams: string, { includeLifecycle = false } = {}) => `FROM ${runStreams}
| ${IN_RANGE} AND ${
  includeLifecycle ? '(event.kind == "run" OR event.kind == "lifecycle")' : 'event.kind == "run"'
}
| EVAL Task = CASE(event.kind == "lifecycle", ${LIFECYCLE_LABEL}, ${TASK_LABEL}), ok_at = CASE(event.outcome == "success", @timestamp, null), fail_at = CASE(event.outcome == "failure", @timestamp, null), failed = CASE(event.outcome == "failure", 1, 0), failure_text = CASE(event.outcome == "failure", ${FAILURE_TEXT}, null)
| STATS Failures = SUM(failed), last_failure = MAX(fail_at), last_success = MAX(ok_at), last_error = LAST(failure_text, fail_at) BY Task`;

const IS_FAILING =
  'last_failure IS NOT NULL AND (last_success IS NULL OR last_failure > last_success)';

const statusStripPanels = ({
  extractionRuns,
  events,
  latestEntities,
}: {
  extractionRuns: string;
  events: string;
  latestEntities: string;
}) => {
  const grid = gridIn();
  const runStreams = `${extractionRuns},${events}`;
  const snapshots = `FROM ${events}
| ${IN_RANGE} AND event.kind == "run" AND event.action == "${SYSTEM_EVENT_ACTION.historySnapshot}" AND event.outcome == "success"`;
  return [
    metricPanel({
      panelId: 'status-failing-tasks',
      title: 'Task health',
      grid: grid(0, 0, 9, 6),
      timeRange: LAST_3_DAYS,
      index: runStreams,
      esql: `${perTaskStatus(runStreams)}
| EVAL failing = CASE(${IS_FAILING}, 1, 0)
| STATS Failing = SUM(failing), Tasks = COUNT(*)
| KEEP Failing, Tasks`,
      metric: 'Failing',
      secondary: 'Tasks',
      secondaryType: 'number',
      palette: thresholdPalette({ from: 1, color: STATUS_COLOR.danger }),
    }),
    metricPanel({
      panelId: 'status-entities',
      title: 'Entities in the store',
      grid: grid(9, 0, 19, 6),
      index: latestEntities,
      timeFiltered: false,
      esql: `FROM ${latestEntities}
| STATS Entities = COUNT(*) BY Type = entity.EngineMetadata.Type
| SORT Type ASC`,
      metric: 'Entities',
      breakdown: 'Type',
    }),
    metricPanel({
      panelId: 'status-success-rate',
      title: 'Extraction, 24 hours',
      grid: grid(28, 0, 9, 6),
      timeRange: LAST_24_HOURS,
      index: extractionRuns,
      esql: `FROM ${extractionRuns}
| ${IN_RANGE}
| EVAL ok = CASE(event.outcome == "success", 1, 0)
| STATS Runs = COUNT(*), ok_runs = SUM(ok)
| EVAL \`Success rate (%)\` = ROUND(100.0 * ok_runs / Runs, 1)
| KEEP \`Success rate (%)\`, Runs`,
      metric: 'Success rate (%)',
      secondary: 'Runs',
      secondaryType: 'number',
    }),
    metricPanel({
      panelId: 'status-last-snapshot',
      title: 'History snapshot',
      grid: grid(37, 0, 11, 6),
      timeRange: LAST_30_DAYS,
      index: events,
      esql: `${snapshots}
| STATS last_success = MAX(@timestamp)
| EVAL \`Hours since success\` = DATE_DIFF("hour", last_success, NOW()), \`Last success\` = CONCAT(DATE_FORMAT("yyyy-MM-dd HH:mm", last_success), " UTC")
| KEEP \`Hours since success\`, \`Last success\``,
      metric: 'Hours since success',
      secondary: 'Last success',
      palette: thresholdPalette({ from: 49, color: STATUS_COLOR.danger }),
    }),
  ];
};

const attentionPanels = (extractionRuns: string, events: string) => {
  const grid = gridIn(SECTION.attention);
  const runStreams = `${extractionRuns},${events}`;
  return [
    tablePanel({
      panelId: 'attention-failing-tasks',
      title: 'Tasks and engine changes with failures (failing first)',
      grid: grid(0, 0, 48, 14),
      index: runStreams,
      esql: `${perTaskStatus(runStreams, { includeLifecycle: true })}
| WHERE Failures > 0
| EVAL Status = CASE(${IS_FAILING}, "Failing", "Recovered"), \`Last failure\` = ${when(
        'last_failure'
      )}, \`Last success\` = ${when(
        'last_success'
      )}, \`Last error\` = COALESCE(last_error, "${NO_VALUE}")
| SORT Status ASC, last_failure DESC
| KEEP Status, Task, Failures, \`Last failure\`, \`Last success\`, \`Last error\`
| LIMIT 100`,
      columns: [
        { field: 'Status', type: 'string' },
        { field: 'Task', type: 'string' },
        { field: 'Failures', type: 'number' },
        { field: 'Last failure', type: 'string', width: 270 },
        { field: 'Last success', type: 'string', width: 270 },
        { field: 'Last error', type: 'string' },
      ],
    }),
  ];
};

const extractionPanels = (index: string) => {
  const from = `FROM ${index}\n| ${IN_RANGE}`;
  const timeRange = LAST_3_DAYS;
  const grid = gridIn(SECTION.extraction);
  return [
    tablePanel({
      panelId: 'extraction-by-task',
      title: 'Extraction by task',
      grid: grid(0, 0, 48, 11),
      timeRange,
      index,
      esql: `${from}
| EVAL ok = CASE(event.outcome == "success", 1, 0), seconds = ${SECONDS}, capped = CASE(entity_store.extraction.logs_cap_applied == true, 1, 0)
| STATS last_run = MAX(@timestamp), Runs = COUNT(*), ok_runs = SUM(ok), Entities = SUM(entity_store.extraction.count), p50 = PERCENTILE(seconds, 50), p95 = PERCENTILE(seconds, 95), Capped = SUM(capped) BY Type = entity_store.entity_type, Mode = entity_store.mode
| EVAL \`Last run\` = ${when(
        'last_run'
      )}, \`Success (%)\` = ROUND(100.0 * ok_runs / Runs, 1), \`p50 (s)\` = ROUND(p50, 1), \`p95 (s)\` = ROUND(p95, 1), \`Cap applied (runs)\` = Capped
| SORT Type ASC, Mode ASC
| KEEP Type, Mode, \`Last run\`, Runs, \`Success (%)\`, Entities, \`p50 (s)\`, \`p95 (s)\`, \`Cap applied (runs)\``,
      columns: [
        { field: 'Type', type: 'string' },
        { field: 'Mode', type: 'string' },
        { field: 'Last run', type: 'string', width: 270 },
        { field: 'Runs', type: 'number' },
        { field: 'Success (%)', type: 'number' },
        { field: 'Entities', type: 'number' },
        { field: 'p50 (s)', type: 'number' },
        { field: 'p95 (s)', type: 'number' },
        { field: 'Cap applied (runs)', type: 'number' },
      ],
    }),
    xyPanel({
      panelId: 'extraction-entities',
      title: 'Entities extracted by type',
      grid: grid(0, 11, 24, 11),
      timeRange,
      index,
      esql: `${from}
| STATS Entities = SUM(entity_store.extraction.count) BY Time = ${AUTO_BUCKET}, Type = entity_store.entity_type`,
      x: 'Time',
      y: ['Entities'],
      breakdown: 'Type',
      seriesType: 'line',
    }),
    xyPanel({
      panelId: 'extraction-failed-runs',
      title: 'Failed runs by type',
      grid: grid(24, 11, 24, 11),
      timeRange,
      index,
      esql: `${from} AND event.outcome == "failure"
| STATS Failures = COUNT(*) BY Time = ${AUTO_BUCKET}, Type = entity_store.entity_type`,
      x: 'Time',
      y: ['Failures'],
      breakdown: 'Type',
    }),
    xyPanel({
      panelId: 'extraction-duration',
      title: 'Extraction duration p95 by type (seconds)',
      grid: grid(0, 22, 48, 10),
      timeRange,
      index,
      esql: `${from}
| EVAL seconds = ${SECONDS}
| STATS p95 = PERCENTILE(seconds, 95) BY Time = ${AUTO_BUCKET}, Type = entity_store.entity_type`,
      x: 'Time',
      y: ['p95'],
      breakdown: 'Type',
      seriesType: 'line',
    }),
  ];
};

const extractionTrendPanels = (index: string) => {
  const from = `FROM ${index}\n| ${IN_RANGE} AND event.kind == "summary" AND event.action == "${SYSTEM_EVENT_ACTION.extraction}"`;
  const grid = gridIn(SECTION.extractionTrend);
  return [
    xyPanel({
      panelId: 'trend-failed-runs',
      title: 'Daily failed runs by type',
      grid: grid(0, 0, 16, 11),
      index,
      esql: `${from}
| STATS Failures = SUM(entity_store.summary.failures) BY Day = BUCKET(@timestamp, 1 day), Type = entity_store.entity_type`,
      x: 'Day',
      y: ['Failures'],
      breakdown: 'Type',
    }),
    xyPanel({
      panelId: 'trend-entities',
      title: 'Daily entities extracted by type',
      grid: grid(16, 0, 16, 11),
      index,
      esql: `${from}
| STATS Entities = SUM(entity_store.summary.entities) BY Day = BUCKET(@timestamp, 1 day), Type = entity_store.entity_type`,
      x: 'Day',
      y: ['Entities'],
      breakdown: 'Type',
      seriesType: 'line',
    }),
    xyPanel({
      panelId: 'trend-duration',
      title: 'Daily extraction duration p95 by type (seconds)',
      grid: grid(32, 0, 16, 11),
      index,
      esql: `${from}
| EVAL seconds = entity_store.summary.duration_p95_ms / 1000.0
| STATS p95 = MAX(seconds) BY Day = BUCKET(@timestamp, 1 day), Type = entity_store.entity_type`,
      x: 'Day',
      y: ['p95'],
      breakdown: 'Type',
      seriesType: 'line',
    }),
  ];
};

const snapshotAndMaintainerPanels = (index: string) => {
  const runs = `FROM ${index}\n| ${IN_RANGE} AND event.kind == "run"`;
  const snapshots = `${runs} AND event.action == "${SYSTEM_EVENT_ACTION.historySnapshot}"`;
  const maintainers = `${runs} AND event.action == "${SYSTEM_EVENT_ACTION.maintainer}"`;
  const grid = gridIn(SECTION.snapshotAndMaintainers);
  return [
    tablePanel({
      panelId: 'maintainer-status',
      title: 'Maintainers (stalest first)',
      grid: grid(0, 0, 48, 12),
      index,
      esql: `${maintainers}
| EVAL ok_at = CASE(event.outcome == "success", @timestamp, null), failed = CASE(event.outcome == "failure", 1, 0), seconds = ${SECONDS}
| STATS last_success = MAX(ok_at), last_run = MAX(@timestamp), Runs = COUNT(*), Failures = SUM(failed), p50 = PERCENTILE(seconds, 50), p95 = PERCENTILE(seconds, 95) BY Maintainer = entity_store.maintainer_id
| SORT last_success ASC NULLS FIRST
| EVAL \`Last success\` = ${when('last_success')}, \`Last run\` = ${when(
        'last_run'
      )}, \`p50 (s)\` = ROUND(p50, 1), \`p95 (s)\` = ROUND(p95, 1)
| KEEP Maintainer, \`Last success\`, \`Last run\`, Runs, Failures, \`p50 (s)\`, \`p95 (s)\``,
      columns: [
        { field: 'Maintainer', type: 'string' },
        { field: 'Last success', type: 'string', width: 270 },
        { field: 'Last run', type: 'string', width: 270 },
        { field: 'Runs', type: 'number' },
        { field: 'Failures', type: 'number', alert: true },
        { field: 'p50 (s)', type: 'number' },
        { field: 'p95 (s)', type: 'number' },
      ],
    }),
    xyPanel({
      panelId: 'maintainer-failures',
      title: 'Maintainer failures per day',
      grid: grid(0, 12, 24, 10),
      index,
      esql: `${maintainers} AND event.outcome == "failure"
| STATS Failures = COUNT(*) BY Day = BUCKET(@timestamp, 1 day), Maintainer = entity_store.maintainer_id`,
      x: 'Day',
      y: ['Failures'],
      breakdown: 'Maintainer',
    }),
    xyPanel({
      panelId: 'snapshot-entities',
      title: 'History snapshot: entities copied per day',
      grid: grid(24, 12, 24, 10),
      index,
      esql: `${snapshots} AND event.outcome == "success"
| STATS Entities = MAX(entity_store.history_snapshot.doc_count) BY Day = BUCKET(@timestamp, 1 day)`,
      x: 'Day',
      y: ['Entities'],
      seriesType: 'line',
    }),
  ];
};

const ABOUT = `**About this data.** Task runs of log extraction, history snapshot and entity maintainers in this space, and changes to the engines (start, stop, install, repairs).
Extraction runs are kept for 3 days (the "last 3 days" panels), then compacted into daily summaries kept for 30 days. Snapshot and maintainer runs are kept for 30 days.
Panels without a window of their own follow the time picker. Reading this data requires \`read\` on \`.entities.v2.system.*\`.`;

const DATE_TIME = '"yyyy-MM-dd HH:mm"';

const engineChangesPanels = (events: string) => {
  const grid = gridIn(SECTION.changes);
  return [
    tablePanel({
      panelId: 'changes-lifecycle',
      title: 'Engine changes (newest first)',
      grid: grid(0, 0, 48, 12),
      index: events,
      esql: `FROM ${events}
| ${IN_RANGE} AND event.kind == "lifecycle"
| SORT @timestamp DESC
| EVAL Time = DATE_FORMAT(${DATE_TIME}, @timestamp), Action = event.action, Outcome = event.outcome, Trigger = entity_store.trigger, Target = COALESCE(${LIFECYCLE_TARGET}, "${NO_VALUE}"), Reason = COALESCE(event.reason, "${NO_VALUE}"), Error = COALESCE(error.message, "${NO_VALUE}")
| KEEP Time, Action, Outcome, Trigger, Target, Reason, Error
| LIMIT 100`,
      columns: [
        { field: 'Time', type: 'string' },
        { field: 'Action', type: 'string' },
        { field: 'Outcome', type: 'string' },
        { field: 'Trigger', type: 'string' },
        { field: 'Target', type: 'string' },
        { field: 'Reason', type: 'string' },
        { field: 'Error', type: 'string' },
      ],
    }),
  ];
};

/** Panels for people who dig: the full runs, the per-event failure list and daily counts. */
const detailsPanels = ({ extractionRuns, events }: { extractionRuns: string; events: string }) => {
  const grid = gridIn(SECTION.details);
  const runStreams = `${extractionRuns},${events}`;
  const rawFrom = `FROM ${extractionRuns}\n| ${IN_RANGE}`;
  const summaryFrom = `FROM ${events}\n| ${IN_RANGE} AND event.kind == "summary" AND event.action == "${SYSTEM_EVENT_ACTION.extraction}"`;
  const maintainers = `FROM ${events}\n| ${IN_RANGE} AND event.kind == "run" AND event.action == "${SYSTEM_EVENT_ACTION.maintainer}"`;
  return [
    tablePanel({
      panelId: 'details-failed-runs',
      title: 'Every failed run (newest first)',
      grid: grid(0, 0, 48, 12),
      index: runStreams,
      esql: `FROM ${runStreams}
| ${IN_RANGE} AND event.kind == "run" AND event.outcome == "failure"
| SORT @timestamp DESC
| EVAL Time = DATE_FORMAT("yyyy-MM-dd HH:mm", @timestamp), Task = ${TASK_LABEL}, Error = ${FAILURE_TEXT}
| KEEP Time, Task, Error
| LIMIT 100`,
      columns: [
        { field: 'Time', type: 'string' },
        { field: 'Task', type: 'string' },
        { field: 'Error', type: 'string' },
      ],
    }),
    xyPanel({
      panelId: 'details-extraction-runs',
      title: 'Extraction runs by type and outcome (last 3 days)',
      grid: grid(0, 12, 48, 11),
      timeRange: LAST_3_DAYS,
      index: extractionRuns,
      esql: `${rawFrom}
| EVAL series = CONCAT(entity_store.entity_type, " · ", event.outcome)
| STATS Runs = COUNT(*) BY Time = ${AUTO_BUCKET}, Series = series`,
      x: 'Time',
      y: ['Runs'],
      breakdown: 'Series',
    }),
    xyPanel({
      panelId: 'details-extraction-logs',
      title: 'Logs processed by type (last 3 days)',
      grid: grid(0, 23, 24, 11),
      timeRange: LAST_3_DAYS,
      index: extractionRuns,
      esql: `${rawFrom}
| STATS Logs = SUM(entity_store.extraction.logs_processed) BY Time = ${AUTO_BUCKET}, Type = entity_store.entity_type`,
      x: 'Time',
      y: ['Logs'],
      breakdown: 'Type',
      seriesType: 'line',
    }),
    xyPanel({
      panelId: 'details-daily-runs',
      title: 'Daily extraction runs by type',
      grid: grid(24, 23, 24, 11),
      index: events,
      esql: `${summaryFrom}
| STATS Runs = SUM(entity_store.summary.runs) BY Day = BUCKET(@timestamp, 1 day), Type = entity_store.entity_type`,
      x: 'Day',
      y: ['Runs'],
      breakdown: 'Type',
      seriesType: 'bar',
    }),
    tablePanel({
      panelId: 'details-failure-days',
      title: 'Days with extraction failures',
      grid: grid(0, 34, 48, 10),
      index: events,
      esql: `${summaryFrom} AND entity_store.summary.failures > 0
| SORT @timestamp DESC
| EVAL Day = DATE_FORMAT("yyyy-MM-dd", @timestamp), Type = entity_store.entity_type, Mode = entity_store.mode, Failures = entity_store.summary.failures, Runs = entity_store.summary.runs, \`Last error\` = COALESCE(entity_store.summary.last_error, "${NO_VALUE}")
| KEEP Day, Type, Mode, Failures, Runs, \`Last error\`
| LIMIT 100`,
      columns: [
        { field: 'Day', type: 'string' },
        { field: 'Type', type: 'string' },
        { field: 'Mode', type: 'string' },
        { field: 'Failures', type: 'number' },
        { field: 'Runs', type: 'number' },
        { field: 'Last error', type: 'string' },
      ],
    }),
    xyPanel({
      panelId: 'details-maintainer-runs',
      title: 'Maintainer runs by maintainer and outcome',
      grid: grid(0, 44, 48, 11),
      index: events,
      esql: `${maintainers}
| EVAL series = CONCAT(entity_store.maintainer_id, " · ", event.outcome)
| STATS Runs = COUNT(*) BY Day = BUCKET(@timestamp, 1 day), Series = series`,
      x: 'Day',
      y: ['Runs'],
      breakdown: 'Series',
    }),
    markdownPanel({ panelId: 'details-about', grid: grid(0, 55, 48, 6), content: ABOUT }),
  ];
};

/** Builds the managed system events dashboard saved object for one space. */
export const buildSystemEventsDashboard = (namespace: string) => {
  const extractionRuns = getExtractionRunsDataStreamName(namespace);
  const events = getSystemEventsDataStreamName(namespace);
  const latestEntities = getLatestEntityIndexPattern(namespace);
  const STATUS_STRIP_HEIGHT = 6;
  const panels = [
    ...statusStripPanels({ extractionRuns, events, latestEntities }),
    ...attentionPanels(extractionRuns, events),
    ...extractionPanels(extractionRuns),
    ...extractionTrendPanels(events),
    ...snapshotAndMaintainerPanels(events),
    ...engineChangesPanels(events),
    ...detailsPanels({ extractionRuns, events }),
  ];
  const sections = [
    { i: SECTION.attention, title: 'Needs attention', collapsed: false },
    { i: SECTION.extraction, title: 'Log extraction: last 3 days', collapsed: false },
    { i: SECTION.extractionTrend, title: 'Log extraction: 30-day trend', collapsed: false },
    {
      i: SECTION.snapshotAndMaintainers,
      title: 'History snapshot and maintainers (30 days)',
      collapsed: false,
    },
    { i: SECTION.changes, title: 'Engine changes (30 days)', collapsed: true },
    { i: SECTION.details, title: 'Details', collapsed: true },
  ].map(({ i, title, collapsed }, index) => ({
    collapsed,
    gridData: { i, y: STATUS_STRIP_HEIGHT + index },
    title,
  }));

  return {
    id: getSystemEventsDashboardId(namespace),
    type: 'dashboard',
    managed: true,
    coreMigrationVersion: CORE_MIGRATION_VERSION,
    typeMigrationVersion: DASHBOARD_TYPE_MIGRATION_VERSION,
    references: [],
    attributes: {
      title: '[Entity Store] Run history',
      description: 'Entity Store task runs: log extraction, history snapshot and maintainers.',
      version: SYSTEM_EVENTS_DASHBOARD_VERSION,
      timeRestore: true,
      timeFrom: 'now-30d',
      timeTo: 'now',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }),
      },
      optionsJSON: JSON.stringify({
        hidePanelTitles: false,
        useMargins: true,
        syncColors: true,
        syncTooltips: false,
        syncCursor: true,
      }),
      panelsJSON: JSON.stringify(panels),
      sections,
    },
  };
};
