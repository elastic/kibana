/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/** What an agent needs to know to build or change a custom app. */
export const CUSTOM_APP_AUTHORING_GUIDE = `A custom app is one JSON document, { "state", "root" }. "root" is a tree of components; every component has a unique "id" (letters, digits, - and _) and a "type".

Components:
- stack { direction: "vertical" | "horizontal", children }: lays out its children. Use horizontal for a row of filters.
- heading { text }, text { text }, callout { title, text?, color: "primary" | "success" | "warning" | "danger" }.
- stat { title, query }: one number, the FIRST column of the FIRST row of its query.
- chart { query, title?, chartType?: "bar" | "line" | "area" | "donut" }: a chart of its query. Leave chartType out and Lens picks the chart from the columns: for a time series return a date column then the numbers; for a breakdown return a category then a number. Name the columns in the query so the chart reads well.
- custom_content { query?, prompt?, template?, height? }: your own HTML layout (a status board, KPI cards, a styled list) filled with the rows of its query. NEVER write the HTML yourself: put what you want in "prompt" and the server writes the template and its height, with the real columns of the query in front of it. To change an existing one, keep its "template" and "height" as they are and add a "prompt" with only the change; to keep it as it is, leave "prompt" out. Prefer stat, chart and table for what they cover; use this for what they cannot express.
- table { query, columns?: [{ field, label? }], onRowClick: [] }: every row of its query, sortable and paged.
- key_value { query, fields?: [column names] }: every row of its query (up to 25), each as a group of fields.
- select { label, bind, options: [{ value, label? }] }, button_group { label, bind, options } (at most 10 options; a select takes up to 50), search { label, bind, placeholder? }: inputs that set a value.
- time_range {}: a time picker that sets the period of the whole app, which every query is limited to. Put one in the row of filters of an app about data that changes over time; an app has at most one, and without one it keeps the last 24 hours.
- button { label, onClick: [actions] }: a button. Its main use is to run a Workflow (see below).
- flyout { title, children }: a side panel that an action opens.

Data: each stat, chart, table and key_value carries its OWN ES|QL "query"; there is no shared data source. Choose columns and rename them inside the query (KEEP, EVAL, RENAME, STATS ... AS). Do not set sizes, spacing, colours or number formats: the app decides how it looks. Use the ES|QL tools available to you to check a query before you use it. Queries may use ?_tstart and ?_tend for the dashboard's time range.

Values: "state" declares the values that change as people use the app: { "name": { "type": "string" | "number" | "boolean", "default": ... } }. A name is letters, digits and underscores. A query uses a value as ?name, for example WHERE service.name == ?service, and text may show it as {{state.name}}. An input's "bind" is the name of a STRING value, which must be declared; for a select or button group its default must be one of its option values. A value that nothing sets is pointless, so declare only what an input binds to or a row click sets.

Row click: a table's "onRowClick" is a list of actions, run in order. { "type": "setState", "key": "<value>", "value": { "fromColumn": "<column of the clicked row>" } } remembers that column in a string value; { "type": "openFlyout", "flyout": "<id of a flyout component>" } opens a flyout; { "type": "closeFlyout" } closes it. The flyout's components can use the remembered value in their queries.

Running a workflow: the action { "type": "runWorkflow", "workflow": "<id of the workflow>", "inputs": { "<name>": <value> } } runs a Workflow as the person who presses the button, after they confirm it. It is valid in a button's "onClick" and a table's "onRowClick", and nowhere else. Each input is a fixed value (text, number or true/false), { "fromState": "<name of a value>" }, or, only in a row click, { "fromColumn": "<column of the clicked row>" }. Only use the id of a workflow you found with the workflow tools, never one you made up; use the workflow's own input names. Give a button a clear label that says what it does, because the person is shown the label and the workflow before it runs.

Example:
${JSON.stringify(AUTHORING_GUIDE_EXAMPLE, null, 2)}`;
