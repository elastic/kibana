/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeCapability, listCapabilities, listEmbeddableDocs } from '@kbn/custom-app-registry';

/**
 * A small app that uses every idea an agent needs: a filter that sets a value, a time range, a table whose
 * query uses it and whose rows remember a column and open a flyout, and a flyout with the detail
 * of the clicked row. A test checks it is a valid document, so the guide cannot drift from the
 * schema.
 */
export const AUTHORING_GUIDE_EXAMPLE = {
  state: {
    name_filter: { type: 'string', default: '' },
    service: { type: 'string', default: '' },
  },
  root: {
    type: 'stack',
    id: 'root',
    direction: 'vertical',
    children: [
      { type: 'heading', id: 'title', text: 'Service health' },
      {
        type: 'stack',
        id: 'filters',
        direction: 'horizontal',
        children: [
          {
            type: 'search',
            id: 'name-filter',
            label: 'Service name',
            placeholder: 'Search services',
            bind: 'name_filter',
          },
          { type: 'time_range', id: 'period' },
        ],
      },
      {
        type: 'table',
        id: 'services',
        query:
          'FROM logs-* | WHERE CONTAINS(service.name, ?name_filter) | STATS errors = COUNT(*) BY service.name | SORT errors DESC',
        onRowClick: [
          { type: 'setState', key: 'service', value: { fromColumn: 'service.name' } },
          { type: 'openFlyout', flyout: 'service-details' },
        ],
      },
      {
        type: 'flyout',
        id: 'service-details',
        title: 'Service {{state.service}}',
        children: [
          {
            type: 'key_value',
            id: 'service-facts',
            query:
              'FROM logs-* | WHERE service.name == ?service | STATS errors = COUNT(*), last_seen = MAX(@timestamp)',
          },
        ],
      },
    ],
  },
} as const;

/** What to know about the types of panel that plugins say something about, under the components. */
const describeEmbeddables = (): string => {
  const docs = listEmbeddableDocs();
  if (docs.length === 0) return '';
  return `\nPanels you can hold in an "embeddable" component, by "embeddableType":\n${docs
    .map(
      ([type, { summary, whenToUse, example }]) =>
        `- ${type}: ${summary} ${whenToUse} Example: ${JSON.stringify(example)}`
    )
    .join('\n')}\n`;
};

/**
 * What an agent needs to know to build or change a custom app. It is made when it is asked for, so
 * that it says what the registry has by then, including what other plugins registered.
 */
export const getAuthoringGuide =
  (): string => `A custom app is one JSON document, { "state", "root", "theme"? }. "root" is a tree of components; every component has a unique "id" (letters, digits, - and _) and a "type".

Look: "theme" is optional and changes every component of the app at once: { "accent"?: "blue" | "teal" | "purple" | "pink" | "orange" | "green" | "red", "shape"?: "soft" | "sharp" }. The accent is the colour of what can be pressed or followed, and the shape is how round the corners are ("soft" is very round, "sharp" is nearly square). Leave it out for the look of Kibana. Set it when the person asks for a look ("make it purple", "rounder"), or when the app is for people outside the team (a presentation or a story), where a clear accent helps; do not set it for a plain tool. To let the person pick the accent, declare a string value whose default is an accent, set "accent" to { "$state": "<that value>" } and bind a button_group or select to the value with the accent names as option values (see Connecting components below). There are no other colours, fonts or sizes to choose. To change the look later, change "theme" and keep the rest of the document as it is.

Components:
${listCapabilities().map(describeCapability).join('\n')}
${describeEmbeddables()}

Connecting components: a value of the app ("state") is set by an input (select, button_group, switch, search, list_input, a form, a click) and read wherever a component needs it. Every component reads values in the same three ways, so any input can drive anything:
- In a query, as ?name.
- In text, as {{state.name}}.
- In a property: wherever a property is a simple choice, a number or a true/false (callout color, stack direction, badge color, progress max and color, metric betterWhen, card icon, columns columns, section open, chart chartType, chart annotations visible, theme accent and shape), you can give { "$state": "name" } instead of a written value, and the property becomes the value of "name" as it is at that moment. The value must be of the property's kind (a string, a number or a boolean) and its default must be a value the property accepts. A value that is not valid for the property at that moment leaves it at its default.
- Every component, of any type, can have "visibleWhen": { "$state": "name" }, which shows it only while that boolean value is true, or "visibleWhen": { "$state": "name", "equals": "details" }, which shows it only while the value is that text, number or boolean. Use it with a switch to reveal details, or with a button_group or select to show one panel at a time. A component that is not shown does not run its query.
Examples: a switch bound to "show_details" and a card with "visibleWhen": { "$state": "show_details" }; a select "severity" with options success, warning and danger, and a badge with "color": { "$state": "severity" }.

Data: each stat, table and key_value carries its OWN ES|QL "query"; there is no shared data source. Choose columns and rename them inside the query (KEEP, EVAL, RENAME, STATS ... AS). Do not set sizes, spacing, colours or number formats: the app decides how it looks. Use the ES|QL tools available to you to check a query before you use it. Queries may use ?_tstart and ?_tend for the dashboard's time range.

Values: "state" declares the values that change as people use the app: { "name": { "type": "string" | "number" | "boolean" | "list", "default": ... } }, where a list is a list of texts, such as ["alice", "bob"], with a default of []. A name is letters, digits and underscores. A query uses a value as ?name, for example WHERE service.name == ?service, and text may show it as {{state.name}}. An input's "bind" is the name of a declared STRING value (a list_input and a select with "multiple" bind a list); for a select or button group its default must be one of its option values. A value that nothing sets is pointless, so declare only what an input binds to or a row click sets.

Row click: a table's "onRowClick" is a list of actions, run in order. { "type": "setState", "key": "<value>", "value": { "fromColumn": "<column of the clicked row>" } } remembers that column in a string value; { "type": "openFlyout", "flyout": "<id of a flyout component>" } opens a flyout; { "type": "closeFlyout" } closes it. The flyout's components can use the remembered value in their queries.

Charts and other panels: a chart is an "embeddable" component of type "vis", whose "state" is a Lens visualization as code, with its own ES|QL data source (for example { "type": "xy", "layers": [{ "type": "line", "data_source": { "type": "esql", "query": "..." }, "x": { "column": "bucket" }, "y": [{ "column": "requests" }] }] }); use the visualization tools you have to get that state, and do not make one up. Any other panel that a dashboard can hold (a map, markdown, a saved Discover session, custom content) is an "embeddable" with its own "embeddableType" and the state that panel has on a dashboard. A panel follows the time range and filters of the app, and an ES|QL panel can use the values of the app as ?name in its query, so a select can change a chart. To let a click on a chart set a value of the app, give the embeddable an "onClick": clicking a bar, a point or a slice runs the actions with the row of the chart behind it, so { "type": "setState", "key": "service", "value": { "fromColumn": "host" } } makes the other components follow it, as a table row click does. Keep a way to clear the value (an "All" option of a select that sets the same value). Only a Lens chart sends a click for now.

Lists: a list_input is a box where people write or paste one value per line, for example the usernames of an incident; the value it binds is a list of those lines, without empty lines and repeats, at most 1000. A select with "multiple": true binds a list too. Declare the bound value with type "list" and default []. A list works in a query as one parameter that holds many values: ... | WHERE user.name IN (?users). Nothing written or chosen is an empty list, so decide what that means in the query (for example, show everything) and try it before you finish. A list is shown in text, {{state.users}}, as its values separated by commas, and a workflow takes it as a list of texts with { "fromState": "users" }. An action that sets a list from a column of a clicked row or from a bar of a chart makes a list of that one value, so a click on a bar can filter by it: use { "type": "setState", "key": "ips", "value": { "fromColumn": "client_ip" } }. A list is not kept in the address of the page, and it cannot filter cases.

Running a workflow: the action { "type": "runWorkflow", "workflow": "<id of the workflow>", "inputs": { "<name>": <value> } } runs a Workflow as the person who presses the button, after they confirm it. It is valid in a button's "onClick", a form's "onSubmit", a table's "onRowClick" and a chart's "onClick", and nowhere else. Each input is a fixed value (text, number or true/false), { "fromState": "<name of a value>" }, or, only in a row click, { "fromColumn": "<column of the clicked row>" }. Only use the id of a workflow you found with the workflow tools, never one you made up; use the workflow's own input names. Give a button a clear label that says what it does, because the person is shown the label and the workflow, with its steps, before it runs. If no workflow does what a button or a form needs, draft one with the workflow generation tool in the same turn, passing a "workflowId" that you choose (lowercase letters, digits and hyphens, for example "escalate-a-case") and that no existing workflow has, so that the draft is saved under it, and use that id in the app: build the whole app now, button or form included, and do not wait. Never use an id that is neither a workflow you found nor a draft you made. Until the person has reviewed and saved the draft in the Workflows application, the button or the form is shown as not ready, saying so, and it works as soon as they save it: tell them that saving the draft is all that is left. You cannot save a workflow yourself.

Alerts and cases: alerts are documents, so an alerts table, stat or chart is an ordinary ES|QL query. There are two systems and they keep their alerts in different places; look at the indices and fields with the tools before you write a query, and never assume. (1) The alerts of rules of the classic kind are in the alert indices, for example FROM .alerts-* | WHERE kibana.alert.workflow_status == "open" | SORT @timestamp DESC | KEEP @timestamp, kibana.alert.rule.name, kibana.alert.severity, host.name | LIMIT 50; fields such as kibana.alert.status, kibana.alert.workflow_status, kibana.alert.reason, kibana.alert.uuid and kibana.alert.rule.name depend on the solution that made the alert. (2) The alerts of the ES|QL rules of the newer kind are events in the data stream .rule-events, one for each run of a rule and group, with the fields @timestamp, episode.id, episode.status, rule.id, group_hash, status, severity and space_id; the events of one alert share an episode.id, and the current state of each is the last event of its episode, for example FROM .rule-events | STATS last_seen = MAX(@timestamp), episode_status = LAST(episode.status, @timestamp), rule = LAST(rule.id, @timestamp) BY episode.id | SORT last_seen DESC | LIMIT 50. Reading alerts takes index privileges on them, so the person may be refused; that is shown to them as the error of the component, which is not something to work around. Never write to an alert index. To act on an alert or a case (create a case, add the alert to a case, acknowledge it), use a button that runs a Workflow, and hand it the id of the alert (kibana.alert.uuid, or episode.id) with a row click that remembers that column. Cases are not read with a query but with a source: a stat, table or key_value has either a "query" or a "source", never both. A cases source is { "type": "cases", "status"?, "severity"?, "search"?, "tag"?, "sort"?: { "field": "created_at" | "updated_at" | "title" | "severity" | "status", "order": "asc" | "desc" }, "limit"?: 1 to 100, "followTimeRange"?: true, "count"?: true }. "status" is "open", "in-progress" or "closed"; "severity" is "low", "medium", "high" or "critical"; "search" and "tag" are text. Each of the four filters is a fixed value or { "fromState": "<name of a value>" }, so that a select or a search box can drive it; an empty text filters nothing, so a select whose "All" option has the value "" works. Without "followTimeRange" the cases are not limited to the period of the app, which is what a list of what is open needs. The columns of a table of cases are always id, title, status, severity, owner, category, tags, assignee_count, total_alerts, total_comments, created_at, updated_at and description; remember "id" with a row click to show or act on one case. The person sees the cases they are allowed to; a refusal is shown as the error of the component. A chart cannot show cases.

Example:
${JSON.stringify(AUTHORING_GUIDE_EXAMPLE, null, 2)}`;
