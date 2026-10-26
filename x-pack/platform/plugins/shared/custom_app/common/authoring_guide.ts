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
export const CUSTOM_APP_AUTHORING_GUIDE = `A custom app is one JSON document, { "state", "root", "theme"? }. "root" is a tree of components; every component has a unique "id" (letters, digits, - and _) and a "type".

Look: "theme" is optional and changes every component of the app at once: { "accent"?: "blue" | "teal" | "purple" | "pink" | "orange" | "green" | "red", "shape"?: "soft" | "sharp" }. The accent is the colour of what can be pressed or followed, and the shape is how round the corners are ("soft" is very round, "sharp" is nearly square). Leave it out for the look of Kibana. Set it when the person asks for a look ("make it purple", "rounder"), or when the app is for people outside the team (a presentation or a story), where a clear accent helps; do not set it for a plain tool. To let the person pick the accent, declare a string value whose default is an accent, set "accent" to { "$state": "<that value>" } and bind a button_group or select to the value with the accent names as option values (see Connecting components below). There are no other colours, fonts or sizes to choose. To change the look later, change "theme" and keep the rest of the document as it is.

Components:
- stack { direction: "vertical" | "horizontal", children }: lays out its children. Use horizontal for a row of filters.
- heading { text }, text { text }, callout { title, text?, color: "primary" | "success" | "warning" | "danger" }. A text is written in Markdown (bold, italics, bullet lists, links): put each list item on a line of its own, starting with "- ", and a blank line between paragraphs. A heading and a callout are plain text, so no Markdown in them. A value in a text, {{state.name}}, is shown as it is, whatever it holds.
- stat { title, query | source }: one number, the FIRST column of the FIRST row of its query. With a cases source and "count": true it shows how many cases match.
- chart { query, title?, chartType?: "bar" | "line" | "area" | "donut", annotations?: { query, time, label?, visible? }, onClick?: [actions] }: a chart of its query. Leave chartType out and Lens picks the chart from the columns: for a time series return a date column then the numbers; for a breakdown return a category then a number. Name the columns in the query so the chart reads well. With "onClick", clicking a bar, a point or a slice runs the actions with the row of the query behind it, so { "type": "setState", "key": "user", "value": { "fromColumn": "user.name" } } makes a click on a bar filter the other components by that user, as a table row click does; a chart split by a series gives both the bar and the series in the same row. Use it to let people pivot from a chart, and keep a way to clear the value (an "All" option of a select that sets the same value). "annotations" marks moments on a chart that is over time, such as deployments or incidents: its own ES|QL query returns one row for each moment, "time" is the column that holds when it happened and "label" the column that names it. Set "visible" to { "$state": "<a boolean value>" } and add a switch bound to that value, to let people turn the annotations on and off.
- custom_content { query?, prompt?, template?, height? }: your own HTML layout (a status board, KPI cards, a styled list) filled with the rows of its query. NEVER write the HTML yourself: put what you want in "prompt" and the server writes the template and its height, with the real columns of the query in front of it. To change an existing one, keep its "template" and "height" as they are and add a "prompt" with only the change; to keep it as it is, leave "prompt" out. Prefer stat, chart and table for what they cover; use this for what they cannot express.
- table { query | source, columns?: [{ field, label? }], onRowClick: [] }: every row of its query or source, sortable and paged.
- key_value { query | source, fields?: [column names] }: every row of its query or source (up to 25), each as a group of fields.
- select { label, bind, options: [{ value, label? }], optionsQuery?, multiple? }, button_group { label, bind, options } (at most 10 options; a select takes up to 50), search { label, bind, placeholder? }, list_input { label, bind, placeholder? }: inputs that set a value. A select can take its options from the data with "optionsQuery", an ES|QL query whose first column is the value of each option and whose optional second column is its label, for example FROM logs-* | STATS BY event.outcome | SORT event.outcome; they come after the ones in "options", so put an "All" option there (a value of "" or "*" that your queries treat as no filter). Use it instead of listing values that you only saw in the data once: it follows the period of the app, and it can use another value, as ?service, to narrow one select by another. A query may return at most 500 options. With "multiple": true a select lets people choose several options, and what it sets is a list (see Lists below).
- switch { label, bind }: an on/off switch. Its key must be declared { "type": "boolean", "default": true|false }, and a query uses it as ?name, which is true or false, for example WHERE ?show_errors OR log.level != "error".
- time_range {}: a time picker that sets the period of the whole app, which every query is limited to. Put one in the row of filters of an app about data that changes over time; an app has at most one, and without one it keeps the last 24 hours.
- link { label, to }: a link to another page of Kibana, shown as a link people can also open in a new tab. "to" is { "type": "discover", "from": "<id of a table, chart, stat, key_value or custom_content that has a query>" } to open that query in Discover, with the current period and the current values written into it; { "type": "app", "app": "<application id>", "path"?: "<path inside it>" } for a page of an application, where the path may hold {{state.key}}, which is written safely as one part of the path; or { "type": "custom_app", "id": "<id of a saved custom app>" }. A link stays inside Kibana and cannot go to another site. Use the application ids and paths you know: "dashboards" with path "#/view/<dashboard id>", "discover", and the apps you were shown; if you are not sure of an application id or path, do not guess it, and use a link to Discover or to another custom app, or say what is missing. A link to a case or an alert needs the application and path of the solution the person uses, which you only know if they told you or you saw it.
- button { label, onClick: [actions] }: a button. Its main use is to run a Workflow (see below).
- form { submitLabel, fields: [{ bind, kind: "text" | "textarea" | "select", label, required?, placeholder?, options? }], onSubmit: [actions] }: asks for answers, and acts on them only when it is submitted. Use it when a workflow needs something a person must write or choose, such as a reason or an urgency, and not for filtering (an input does that as it changes). Each field's "bind" is the name of a declared STRING value (a field of its own, so no two fields share one) that the answer is put in when the form is submitted; a "select" field needs "options" [{ value, label? }]; "required" fields must be answered before anything happens. The form's "onSubmit" runs after the answers are put in their values, so a runWorkflow there hands them over with { "fromState": "<bind>" }. A form has at most 10 fields and takes no row, so its inputs cannot use "fromColumn" (remember what it needs from a row click first, into values, and hand those over with "fromState").
- card { title?, description?, icon?, children }: a bordered card that groups what is in it, with a title, a line of description and an icon from: alert, bell, bolt, calendar, check, clock, database, flag, gear, globe, heart, lock, search, user, users. Use cards to make parts of a page stand out, such as a summary above a chart.
- columns { columns: 2 | 3 | 4, children }: puts its children side by side in that many columns, wrapping under each other on a narrow screen. Use it for a row of metrics or cards.
- tabs { children: [section] } and accordion { children: [section] }: they hold only "section" components, { label, children, open? } (an accordion section starts open with "open": true), and a section is used nowhere else. Tabs show one section at a time; an accordion opens and closes each. Use them to keep a long page short.
- metric { title, query | source, compare?, betterWhen?: "higher" | "lower" }: a number, the FIRST column of the FIRST row, like a stat. With "compare", the name of another column that holds what it was before, it also shows the change in percent, coloured as better or worse ("betterWhen" is "higher" by default; use "lower" for errors or latency). Write the query so that its one row has both numbers, for example by counting the last hour and the hour before it in two columns.
- progress { label?, query | source, max?, color?: "primary" | "success" | "warning" | "danger" }: a bar filled as far as the FIRST column of the FIRST row, which must be a number, is of "max" (100 by default). For a percentage leave max alone.
- badge { text, color?: "default" | "primary" | "success" | "accent" | "warning" | "danger" | "hollow" }: a short coloured word such as a status. Its text may use {{state.key}}.
- flyout { title, children }: a side panel that an action opens.

Connecting components: a value of the app ("state") is set by an input (select, button_group, switch, search, list_input, a form, a click) and read wherever a component needs it. Every component reads values in the same three ways, so any input can drive anything:
- In a query, as ?name.
- In text, as {{state.name}}.
- In a property: wherever a property is a simple choice, a number or a true/false (callout color, stack direction, badge color, progress max and color, metric betterWhen, card icon, columns columns, section open, chart chartType, chart annotations visible, theme accent and shape), you can give { "$state": "name" } instead of a written value, and the property becomes the value of "name" as it is at that moment. The value must be of the property's kind (a string, a number or a boolean) and its default must be a value the property accepts. A value that is not valid for the property at that moment leaves it at its default.
- Every component, of any type, can have "visibleWhen": { "$state": "name" }, which shows it only while that boolean value is true, or "visibleWhen": { "$state": "name", "equals": "details" }, which shows it only while the value is that text, number or boolean. Use it with a switch to reveal details, or with a button_group or select to show one panel at a time. A component that is not shown does not run its query.
Examples: a switch bound to "show_details" and a card with "visibleWhen": { "$state": "show_details" }; a select "severity" with options success, warning and danger, and a badge with "color": { "$state": "severity" }.

Data: each stat, chart, table and key_value carries its OWN ES|QL "query"; there is no shared data source. Choose columns and rename them inside the query (KEEP, EVAL, RENAME, STATS ... AS). Do not set sizes, spacing, colours or number formats: the app decides how it looks. Use the ES|QL tools available to you to check a query before you use it. Queries may use ?_tstart and ?_tend for the dashboard's time range.

Values: "state" declares the values that change as people use the app: { "name": { "type": "string" | "number" | "boolean" | "list", "default": ... } }, where a list is a list of texts, such as ["alice", "bob"], with a default of []. A name is letters, digits and underscores. A query uses a value as ?name, for example WHERE service.name == ?service, and text may show it as {{state.name}}. An input's "bind" is the name of a declared STRING value (a list_input and a select with "multiple" bind a list); for a select or button group its default must be one of its option values. A value that nothing sets is pointless, so declare only what an input binds to or a row click sets.

Row click: a table's "onRowClick" is a list of actions, run in order. { "type": "setState", "key": "<value>", "value": { "fromColumn": "<column of the clicked row>" } } remembers that column in a string value; { "type": "openFlyout", "flyout": "<id of a flyout component>" } opens a flyout; { "type": "closeFlyout" } closes it. The flyout's components can use the remembered value in their queries.

Lists: a list_input is a box where people write or paste one value per line, for example the usernames of an incident; the value it binds is a list of those lines, without empty lines and repeats, at most 1000. A select with "multiple": true binds a list too. Declare the bound value with type "list" and default []. A list works in a query as one parameter that holds many values: ... | WHERE user.name IN (?users). Nothing written or chosen is an empty list, so decide what that means in the query (for example, show everything) and try it before you finish. A list is shown in text, {{state.users}}, as its values separated by commas, and a workflow takes it as a list of texts with { "fromState": "users" }. An action that sets a list from a column of a clicked row or from a bar of a chart makes a list of that one value, so a click on a bar can filter by it: use { "type": "setState", "key": "ips", "value": { "fromColumn": "client_ip" } }. A list is not kept in the address of the page, and it cannot filter cases.

Running a workflow: the action { "type": "runWorkflow", "workflow": "<id of the workflow>", "inputs": { "<name>": <value> } } runs a Workflow as the person who presses the button, after they confirm it. It is valid in a button's "onClick", a form's "onSubmit", a table's "onRowClick" and a chart's "onClick", and nowhere else. Each input is a fixed value (text, number or true/false), { "fromState": "<name of a value>" }, or, only in a row click, { "fromColumn": "<column of the clicked row>" }. Only use the id of a workflow you found with the workflow tools, never one you made up; use the workflow's own input names. Give a button a clear label that says what it does, because the person is shown the label and the workflow, with its steps, before it runs. If no workflow does what a button or a form needs, draft one with the workflow generation tool in the same turn, passing a "workflowId" that you choose (lowercase letters, digits and hyphens, for example "escalate-a-case") and that no existing workflow has, so that the draft is saved under it, and use that id in the app: build the whole app now, button or form included, and do not wait. Never use an id that is neither a workflow you found nor a draft you made. Until the person has reviewed and saved the draft in the Workflows application, the button or the form is shown as not ready, saying so, and it works as soon as they save it: tell them that saving the draft is all that is left. You cannot save a workflow yourself.

Alerts and cases: alerts are documents, so an alerts table, stat or chart is an ordinary ES|QL query. There are two systems and they keep their alerts in different places; look at the indices and fields with the tools before you write a query, and never assume. (1) The alerts of rules of the classic kind are in the alert indices, for example FROM .alerts-* | WHERE kibana.alert.workflow_status == "open" | SORT @timestamp DESC | KEEP @timestamp, kibana.alert.rule.name, kibana.alert.severity, host.name | LIMIT 50; fields such as kibana.alert.status, kibana.alert.workflow_status, kibana.alert.reason, kibana.alert.uuid and kibana.alert.rule.name depend on the solution that made the alert. (2) The alerts of the ES|QL rules of the newer kind are events in the data stream .rule-events, one for each run of a rule and group, with the fields @timestamp, episode.id, episode.status, rule.id, group_hash, status, severity and space_id; the events of one alert share an episode.id, and the current state of each is the last event of its episode, for example FROM .rule-events | STATS last_seen = MAX(@timestamp), episode_status = LAST(episode.status, @timestamp), rule = LAST(rule.id, @timestamp) BY episode.id | SORT last_seen DESC | LIMIT 50. Reading alerts takes index privileges on them, so the person may be refused; that is shown to them as the error of the component, which is not something to work around. Never write to an alert index. To act on an alert or a case (create a case, add the alert to a case, acknowledge it), use a button that runs a Workflow, and hand it the id of the alert (kibana.alert.uuid, or episode.id) with a row click that remembers that column. Cases are not read with a query but with a source: a stat, table or key_value has either a "query" or a "source", never both. A cases source is { "type": "cases", "status"?, "severity"?, "search"?, "tag"?, "sort"?: { "field": "created_at" | "updated_at" | "title" | "severity" | "status", "order": "asc" | "desc" }, "limit"?: 1 to 100, "followTimeRange"?: true, "count"?: true }. "status" is "open", "in-progress" or "closed"; "severity" is "low", "medium", "high" or "critical"; "search" and "tag" are text. Each of the four filters is a fixed value or { "fromState": "<name of a value>" }, so that a select or a search box can drive it; an empty text filters nothing, so a select whose "All" option has the value "" works. Without "followTimeRange" the cases are not limited to the period of the app, which is what a list of what is open needs. The columns of a table of cases are always id, title, status, severity, owner, category, tags, assignee_count, total_alerts, total_comments, created_at, updated_at and description; remember "id" with a row click to show or act on one case. The person sees the cases they are allowed to; a refusal is shown as the error of the component. A chart cannot show cases.

Example:
${JSON.stringify(AUTHORING_GUIDE_EXAMPLE, null, 2)}`;
