/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomAppDefinition } from '../../common/app_definition';
import {
  ACTION_SET_DATA,
  K8S_ALERTS_INDEX,
  K8S_LOGS_INDEX,
  K8S_POD_METRICS_INDEX,
} from '../../common/constants';
import { surface } from './surface';

/**
 * Every filter is optional, and its resting state is the empty string — which is
 * what a cleared control resolves to. `?p == ""` short-circuits to "no filter", so
 * one query serves both the unfiltered first paint and any combination of
 * selections. Multi-selects arrive as CSV because ES|QL has no defined
 * substitution for an *empty* multi-value parameter.
 */
const FILTER_CLAUSES = `| WHERE (?q == "" OR LOCATE(TO_LOWER(pod), TO_LOWER(?q)) > 0)
      AND (?clusters == "" OR MV_CONTAINS(SPLIT(?clusters, ","), cluster))
      AND (?namespaces == "" OR MV_CONTAINS(SPLIT(?namespaces, ","), namespace))
      AND (?health == "" OR MV_CONTAINS(SPLIT(?health, ","), health))`;

/**
 * Resolves a pod's health in one pass: the metrics collapse to a row per pod, then
 * a lookup join adds the alert state. Health is stored rather than derived from
 * thresholds, because "no alert set up" is a statement about rule coverage that no
 * metric can express — and because a pod's status should not change when the
 * reader moves the time picker.
 */
const PODS_QUERY = `FROM ${K8S_POD_METRICS_INDEX}
| STATS cpu = ROUND(AVG(metrics.k8s.pod.cpu_limit_utilization) * 100, 1),
        mem = ROUND(AVG(metrics.k8s.pod.memory_limit_utilization) * 100, 1)
    BY entity_id = resource.attributes.k8s.pod.uid,
       pod = resource.attributes.k8s.pod.name,
       namespace = resource.attributes.k8s.namespace.name,
       cluster = resource.attributes.k8s.cluster.name,
       node = resource.attributes.k8s.node.name
| WHERE pod IS NOT NULL
| LOOKUP JOIN ${K8S_ALERTS_INDEX} ON entity_id
| EVAL health = COALESCE(alert_status, "untracked"),
       rank = CASE(health == "active", 0, health == "untracked", 2, 1)
${FILTER_CLAUSES}
| SORT rank ASC, cpu DESC
| KEEP pod, namespace, cluster, node, cpu, mem, health, reason, rule_count
| LIMIT 40`;

/**
 * The honeycomb draws one cell per pod, so it keeps every match rather than the
 * table's top 40, and returns only the four fields a cell and its flyout need.
 */
const GRID_QUERY = `FROM ${K8S_POD_METRICS_INDEX}
| STATS cpu = ROUND(AVG(metrics.k8s.pod.cpu_limit_utilization) * 100, 1),
        mem = ROUND(AVG(metrics.k8s.pod.memory_limit_utilization) * 100, 1)
    BY entity_id = resource.attributes.k8s.pod.uid,
       pod = resource.attributes.k8s.pod.name,
       namespace = resource.attributes.k8s.namespace.name,
       cluster = resource.attributes.k8s.cluster.name,
       node = resource.attributes.k8s.node.name
| WHERE pod IS NOT NULL
| LOOKUP JOIN ${K8S_ALERTS_INDEX} ON entity_id
| EVAL health = COALESCE(alert_status, "untracked")
${FILTER_CLAUSES}
| KEEP pod, namespace, cluster, node, cpu, mem, health, reason, rule_count
| LIMIT 1200`;

const PODS_PARAMS = {
  q: '/filters/search',
  clusters: '/filters/clusters',
  namespaces: '/filters/namespaces',
  health: '/filters/health',
};

/**
 * A visualization the catalog has no component for, rendered through Kibana's
 * Custom HTML panel instead. `.pct` is each value as a percentage of its column's
 * maximum, which is exactly what a bar width wants, and `--cc-vis-*` is EUI's
 * colourblind-safe palette, so this follows the theme with no work.
 */
const NAMESPACE_TEMPLATE = `<!-- cc-height: 340 -->
<style>
  .hdr, .row { display: flex; align-items: center; gap: var(--cc-space-s); font-size: 12px; }
  .hdr { color: var(--cc-color-text); opacity: .65; margin-bottom: var(--cc-space-s); }
  .row { margin-bottom: var(--cc-space-xs); }
  .name { width: 120px; flex: none; }
  .track { flex: 1; height: 16px; background: var(--cc-color-surface);
           border: 1px solid var(--cc-color-border); border-radius: var(--cc-radius-s); overflow: hidden; }
  .hdr .track { background: none; border: none; }
  .bar { display: block; height: 100%; }
  .val { width: 62px; flex: none; text-align: right; font-variant-numeric: tabular-nums; }
</style>
{% if rows.size == 0 %}<p>No namespaces in this time range.</p>{% endif %}
<div class="hdr"><span class="name">Namespace</span><span class="track"></span><span class="val">Pods</span><span class="track"></span><span class="val">CPU</span></div>
{% for row in rows %}
<div class="row">
  <span class="name">{{ row["namespace"].value }}</span>
  <span class="track"><span class="bar" style="width: {{ row["pods"].pct }}%; background: var(--cc-vis-0);"></span></span>
  <span class="val">{{ row["pods"].value }}</span>
  <span class="track"><span class="bar" style="width: {{ row["cpu"].pct }}%; background: var(--cc-vis-3);"></span></span>
  <span class="val">{{ row["cpu"].value }}%</span>
</div>
{% endfor %}`;

const kubernetes = (): CustomAppDefinition => ({
  version: 1,
  title: 'Kubernetes',
  description: 'Pods, nodes and alert state across two clusters, from OTel metrics and logs.',
  layout: {
    // Untabbed, so the heading and time picker persist across tabs.
    header: { type: 'panel', id: 'header', row: 0, column: 0, width: 32, height: 3 },
    toolbar: { type: 'panel', id: 'toolbar', row: 0, column: 32, width: 16, height: 3 },
    filters: { type: 'panel', id: 'filters', row: 3, column: 0, width: 48, height: 2 },

    // Each tab starts from the same row, since only one is visible at a time.
    summary: { type: 'panel', id: 'summary', row: 5, column: 0, width: 48, height: 6 },
    legend: { type: 'panel', id: 'legend', row: 11, column: 0, width: 48, height: 4 },
    grid: { type: 'panel', id: 'grid', row: 15, column: 0, width: 48, height: 30 },
    pods: { type: 'panel', id: 'pods', row: 45, column: 0, width: 48, height: 24 },

    nsHelp: { type: 'panel', id: 'nsHelp', row: 5, column: 0, width: 48, height: 4 },
    namespaces: { type: 'panel', id: 'namespaces', row: 9, column: 0, width: 48, height: 19 },

    logHelp: { type: 'panel', id: 'logHelp', row: 5, column: 0, width: 48, height: 4 },
    logs: { type: 'panel', id: 'logs', row: 9, column: 0, width: 48, height: 22 },
  },
  panels: {
    // Prose and controls read as page content, so they lose the panel frame.
    header: { hideBorder: true },
    toolbar: { hideBorder: true },
    filters: { hideBorder: true },
    summary: { title: 'Fleet', tab: 'Resources' },
    legend: { hideBorder: true, tab: 'Resources' },
    grid: { hideBorder: true, tab: 'Resources' },
    pods: { title: 'Pods', tab: 'Resources' },
    nsHelp: { hideBorder: true, tab: 'Namespaces' },
    namespaces: { title: 'Pods and CPU by namespace', tab: 'Namespaces' },
    logHelp: { hideBorder: true, tab: 'Logs' },
    logs: { title: 'Noisiest containers', tab: 'Logs' },
  },
  queries: {
    summary: [
      {
        path: '/fleet',
        shape: 'first',
        query: `FROM ${K8S_POD_METRICS_INDEX} | STATS pods = COUNT_DISTINCT(resource.attributes.k8s.pod.uid), nodes = COUNT_DISTINCT(resource.attributes.k8s.node.name), clusters = COUNT_DISTINCT(resource.attributes.k8s.cluster.name), cpu = ROUND(AVG(metrics.k8s.pod.cpu_limit_utilization) * 100, 1)`,
      },
    ],
    legend: [
      {
        path: '/healthMix',
        shape: 'rows',
        // The alert index has no time field, so the page time picker leaves it
        // alone — which is correct: alert state is current, not historical.
        // The colour and the wording come from the query rather than the catalog,
        // so the legend cannot drift from the statuses the data actually holds.
        query: `FROM ${K8S_ALERTS_INDEX} | STATS count = COUNT(*) BY status = alert_status | EVAL color = CASE(status == "active", "danger", status == "clear", "success", "subdued"), label = CASE(status == "active", "Resources with active alerts", status == "clear", "Resources with no active alerts", "Resources with no alert set up") | SORT count DESC`,
      },
    ],
    filters: [
      {
        path: '/options/clusters',
        shape: 'rows',
        query: `FROM ${K8S_POD_METRICS_INDEX} | STATS pods = COUNT_DISTINCT(resource.attributes.k8s.pod.uid) BY name = resource.attributes.k8s.cluster.name | WHERE name IS NOT NULL | SORT name`,
      },
      {
        path: '/options/namespaces',
        shape: 'rows',
        query: `FROM ${K8S_POD_METRICS_INDEX} | STATS pods = COUNT_DISTINCT(resource.attributes.k8s.pod.uid) BY name = resource.attributes.k8s.namespace.name | WHERE name IS NOT NULL | SORT name`,
      },
    ],
    grid: [
      {
        path: '/clusterGroups',
        shape: 'groups',
        groupBy: 'cluster',
        query: GRID_QUERY,
        params: PODS_PARAMS,
      },
    ],
    pods: [{ path: '/pods', shape: 'rows', query: PODS_QUERY, params: PODS_PARAMS }],
    logs: [
      {
        path: '/logEvents',
        shape: 'rows',
        query: `FROM ${K8S_LOGS_INDEX} | WHERE severity_text IN ("ERROR", "FATAL") | STATS events = COUNT(*) BY pod = resource.attributes.k8s.pod.name, namespace = resource.attributes.k8s.namespace.name, severity = severity_text | SORT events DESC | LIMIT 15`,
      },
    ],
  },
  surfaces: {
    header: surface('header', [
      { id: 'root', component: 'Column', children: ['titleRow', 'subtitle'], gap: 'xs' },
      {
        id: 'titleRow',
        component: 'Row',
        children: ['title', 'lab'],
        gap: 's',
        align: 'center',
      },
      { id: 'title', component: 'Text', text: 'Kubernetes', variant: 'heading1' },
      { id: 'lab', component: 'Badge', label: 'LAB', color: 'hollow' },
      {
        id: 'subtitle',
        component: 'Text',
        text: 'Pod health across two clusters, from OTel metrics joined to alert state.',
        color: 'subdued',
      },
    ]),
    toolbar: surface('toolbar', [
      { id: 'root', component: 'Column', children: ['label', 'picker'], gap: 'xs' },
      { id: 'label', component: 'Text', text: 'Time range', variant: 'caption', color: 'subdued' },
      { id: 'picker', component: 'KbnTimeFilter', showUpdateButton: false, fullWidth: true },
    ]),
    filters: surface(
      'filters',
      [
        {
          id: 'root',
          component: 'Row',
          gap: 's',
          align: 'center',
          // The search box takes whatever width the pills leave.
          grow: [1, 0],
          children: ['search', 'pills'],
        },
        {
          id: 'search',
          component: 'TextField',
          variant: 'search',
          hideLabel: true,
          compressed: true,
          label: 'Search pods',
          placeholder: 'Search pods — try "checkout" or "search-api"',
          value: { path: '/filters/search' },
        },
        { id: 'pills', component: 'FilterGroup', children: ['clusters', 'namespaces', 'health'] },
        {
          id: 'clusters',
          component: 'MultiSelectFilter',
          label: 'Cluster',
          emptyLabel: 'All clusters',
          value: { path: '/filters/clusters' },
          options: { path: '/options/clusters' },
          optionLabelField: 'name',
          optionValueField: 'name',
        },
        {
          id: 'namespaces',
          component: 'MultiSelectFilter',
          label: 'Namespace',
          emptyLabel: 'All namespaces',
          value: { path: '/filters/namespaces' },
          options: { path: '/options/namespaces' },
          optionLabelField: 'name',
          optionValueField: 'name',
        },
        {
          id: 'health',
          component: 'MultiSelectFilter',
          label: 'Health',
          emptyLabel: 'Any health',
          searchable: false,
          value: { path: '/filters/health' },
          options: [
            { name: 'active', label: 'Active alerts' },
            { name: 'clear', label: 'No active alerts' },
            { name: 'untracked', label: 'Not monitored' },
          ],
          optionLabelField: 'label',
          optionValueField: 'name',
        },
      ],
      // Seeded empty so every parameter resolves to "" on the first paint, which
      // the query reads as "no filter".
      { filters: { search: '', clusters: [], namespaces: [], health: [] } }
    ),
    summary: surface('summary', [
      { id: 'root', component: 'Row', children: ['pods', 'nodes', 'clusters', 'cpu'], gap: 'l' },
      {
        id: 'pods',
        component: 'Stat',
        title: { call: 'formatNumber', args: { value: { path: '/fleet/pods' } } },
        description: 'Pods',
        color: 'primary',
      },
      {
        id: 'nodes',
        component: 'Stat',
        title: { call: 'formatNumber', args: { value: { path: '/fleet/nodes' } } },
        description: 'Nodes',
        color: 'default',
      },
      {
        id: 'clusters',
        component: 'Stat',
        title: { call: 'formatNumber', args: { value: { path: '/fleet/clusters' } } },
        description: 'Clusters',
        color: 'accent',
      },
      {
        id: 'cpu',
        component: 'Stat',
        title: {
          call: 'concat',
          args: { values: [{ path: '/fleet/cpu' }, '%'], separator: '' },
        },
        description: 'Mean CPU of limit',
        color: 'warning',
      },
    ]),
    legend: surface('legend', [
      { id: 'root', component: 'Row', children: ['label', 'items'], gap: 'l', align: 'center' },
      { id: 'label', component: 'Text', text: 'Alerts:', variant: 'caption', color: 'subdued' },
      // One Health dot per row the query returned, rather than three hardcoded
      // ones, so the legend cannot disagree with the data.
      {
        id: 'items',
        component: 'Row',
        gap: 'l',
        children: { componentId: 'dot', path: '/healthMix' },
      },
      {
        id: 'dot',
        component: 'Health',
        color: { path: 'color' },
        label: {
          call: 'concat',
          args: { values: [{ path: 'count' }, ' ', { path: 'label' }], separator: '' },
        },
      },
    ]),
    // One card per cluster, from a ChildList template over the grouped query —
    // so the app follows however many clusters the data actually has rather than
    // hardcoding two panels.
    grid: surface('grid', [
      {
        id: 'root',
        component: 'Column',
        gap: 'm',
        children: { componentId: 'clusterCard', path: '/clusterGroups' },
      },
      { id: 'clusterCard', component: 'Card', header: 'cardHeader', child: 'cardGrid' },
      {
        id: 'cardHeader',
        component: 'Row',
        justify: 'spaceBetween',
        align: 'center',
        children: ['cardTitle', 'cardActions'],
      },
      {
        id: 'cardTitle',
        component: 'Row',
        gap: 's',
        align: 'center',
        // Relative paths resolve against the current group.
        children: ['cardName', 'cardCount'],
      },
      { id: 'cardName', component: 'Text', text: { path: 'key' }, variant: 'heading3' },
      { id: 'cardCount', component: 'Badge', label: { path: 'count' }, color: 'hollow' },
      {
        id: 'cardActions',
        component: 'Button',
        variant: 'icon',
        iconType: 'gear',
        color: 'text',
        label: 'Cluster settings',
        action: {
          event: { name: ACTION_SET_DATA, context: { path: '/ui/grid/menu', value: true } },
        },
      },
      {
        id: 'cardGrid',
        component: 'StatusGrid',
        cells: { path: 'items' },
        labelField: 'pod',
        statusField: 'health',
        statuses: [
          { value: 'active', label: 'Active alerts', color: 'danger' },
          { value: 'clear', label: 'No active alerts', color: 'success' },
          { value: 'untracked', label: 'No alert set up', color: 'subdued' },
        ],
        defaultColor: 'subdued',
        // Writes the clicked pod to the same path the table's row action uses, so
        // the flyout declared in the Pods panel opens from here too.
        action: { event: { name: ACTION_SET_DATA, context: { path: '/selectedPod' } } },
      },
    ]),
    pods: surface(
      'pods',
      [
        { id: 'root', component: 'Column', children: ['table', 'detail'], gap: 's' },
        {
          id: 'table',
          component: 'Table',
          caption: 'Pods by health then CPU, worst first',
          compressed: true,
          rows: { path: '/pods' },
          columns: [
            { field: 'pod', name: 'Pod' },
            { field: 'namespace', name: 'Namespace' },
            { field: 'cluster', name: 'Cluster' },
            { field: 'health', name: 'Health' },
            { field: 'cpu', name: 'CPU %', align: 'right' },
            { field: 'mem', name: 'Memory %', align: 'right' },
          ],
          rowActions: [
            {
              label: 'Inspect pod',
              iconType: 'inspect',
              action: { event: { name: ACTION_SET_DATA, context: { path: '/selectedPod' } } },
            },
          ],
        },
        {
          id: 'detail',
          component: 'Flyout',
          title: 'Pod detail',
          size: 's',
          isOpen: {
            call: 'not',
            args: { value: { call: 'isEmpty', args: { value: { path: '/selectedPod' } } } },
          },
          child: 'detailBody',
          footer: 'detailClose',
          onClose: {
            event: { name: ACTION_SET_DATA, context: { path: '/selectedPod', value: null } },
          },
        },
        {
          id: 'detailBody',
          component: 'DescriptionList',
          items: [
            { title: 'Pod', description: { path: '/selectedPod/pod' } },
            { title: 'Namespace', description: { path: '/selectedPod/namespace' } },
            { title: 'Cluster', description: { path: '/selectedPod/cluster' } },
            { title: 'Node', description: { path: '/selectedPod/node' } },
            { title: 'Health', description: { path: '/selectedPod/health' } },
            { title: 'Why', description: { path: '/selectedPod/reason' } },
            { title: 'Rules covering it', description: { path: '/selectedPod/rule_count' } },
            { title: 'CPU % of limit', description: { path: '/selectedPod/cpu' } },
            { title: 'Memory % of limit', description: { path: '/selectedPod/mem' } },
          ],
        },
        {
          id: 'detailClose',
          component: 'Button',
          label: 'Close',
          variant: 'primary',
          action: {
            event: { name: ACTION_SET_DATA, context: { path: '/selectedPod', value: null } },
          },
        },
      ],
      { selectedPod: null }
    ),
    nsHelp: surface('nsHelp', [
      {
        id: 'root',
        component: 'Text',
        text: "This panel is not an EUI component — it is Kibana's **Custom HTML** panel, so the agent can generate any visualization it can express as themed HTML and SVG. It renders in a sandboxed iframe, which is why it is a picture rather than something you can click.",
        color: 'subdued',
      },
    ]),
    namespaces: surface('namespaces', [
      {
        id: 'root',
        component: 'KbnCustomContentPanel',
        template: NAMESPACE_TEMPLATE,
        // Grouped by cluster first so the filter has a column to match on, then
        // rolled up to one row per namespace.
        esql: `FROM ${K8S_POD_METRICS_INDEX} | STATS pods = COUNT_DISTINCT(resource.attributes.k8s.pod.uid), cpu = AVG(metrics.k8s.pod.cpu_limit_utilization) * 100 BY namespace = resource.attributes.k8s.namespace.name, cluster = resource.attributes.k8s.cluster.name | WHERE namespace IS NOT NULL AND (?clusters == "" OR MV_CONTAINS(SPLIT(?clusters, ","), cluster)) | STATS pods = SUM(pods), cpu = ROUND(AVG(cpu), 1) BY namespace | SORT pods DESC`,
        // The panel owns its query, so the page filters reach it as bound
        // variables rather than through the data model like every other panel.
        variables: [{ key: 'clusters', value: { path: '/filters/clusters' } }],
      },
    ]),
    logHelp: surface('logHelp', [
      {
        id: 'root',
        component: 'Text',
        text: 'Containers emitting **ERROR** or **FATAL** in the selected range. The unhealthy pods here are the same ones flagged on the Resources tab — the generator correlates their error bursts with their CPU and memory spikes.',
        color: 'subdued',
      },
    ]),
    logs: surface('logs', [
      {
        id: 'root',
        component: 'Table',
        caption: 'Containers by error volume',
        compressed: true,
        rows: { path: '/logEvents' },
        columns: [
          { field: 'pod', name: 'Pod' },
          { field: 'namespace', name: 'Namespace' },
          { field: 'severity', name: 'Severity' },
          { field: 'events', name: 'Events', align: 'right' },
        ],
      },
    ]),
  },
});

export const kubernetesTemplate = {
  id: 'kubernetes',
  name: 'Kubernetes',
  description:
    'Pod health across two clusters: OTel metrics joined to alert state, with a detail flyout.',
  indexPattern: K8S_POD_METRICS_INDEX,
  build: kubernetes,
};
