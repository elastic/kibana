/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const x = 'a';

export const content = `
# sql_rule 

Kibana alerting rule that uses SQL. with the resultant SQL columns selecting both the alert id (nee: alert instance id, like a host name) and context variables.

The column named \`instanceId\` must be included in the selected columns, and will be used as the instance id of the alert.  The SQL query should only return one row for each value.

The remaining columns will be used as context variables for the alert.

As an example, we'll build a rule which does a query over an index with documents in the following shape:

    {
      "@timestamp": "2022-04-04T14:47:08.265Z",
      "host": {"name": "host-1"},
      "system": {
        "cpu": {
          "total": {
            "norm": {"pct": 0.5}
          }
        },
        "memory": {
          "actual": {"free": 200000},
          "total": 1000000
        }
      }
    }

A command-line tool[\`es-apm-sys-sim\`](https://github.com/pmuellr/es-apm-sys-sim) can be used to generate these documents with values changing over time. 

    curl -H 'kbn-xsrf: foo' -H 'content-type: application/json' $KBN_URL/api/alerting/rule -d '{
      "name": "sql rule example",
      "rule_type_id": "ow22-sql",
      "schedule": { "interval": "1s" },
      "notify_when": "onActiveAlert",
      "enabled": true,
      "consumer": "stackAlerts",
      "params": {
        "query": "SELECT TOP 10 host.name AS instanceId, AVG(system.cpu.total.norm.pct) AS cpu, AVG(system.memory.actual.free) AS freemem FROM \\"es-apm-sys-sim\\" WHERE (\\"@timestamp\\" > (NOW() - INTERVAL 5 SECONDS)) GROUP BY host.name HAVING AVG(system.cpu.total.norm.pct) > 0.80"
      },
      "actions": [
        { "group": "found", "id": "server-log", "params": { "message": "rule {{alertName}} triggered for {{alertInstanceId}}; cpu: {{context.cpu}}; free memory: {{context.freemem}}" } }
      ]
    }'

A nicely formatted version of this SQL query is:

    SELECT 
      TOP 10 
      host.name AS instanceId, 
      AVG(system.cpu.total.norm.pct) AS cpu, 
      AVG(system.memory.actual.free) AS freemem 
    FROM \"es-apm-sys-sim\" 
    WHERE 
      (\"@timestamp\" > (NOW() - INTERVAL 5 SECONDS)) 
    GROUP BY host.name 
    HAVING 
      AVG(system.cpu.total.norm.pct) > 0.80

This is basically the same thing as the index threshold query where:

    when:          average()
    of:            system.cpu.total.norm.pct
    grouped over:  top 10 'host.name'
    condition:     is above 0.8
    for the last:  5 seconds

The human version: alert when the average of a host's CPU over 5 seconds is > 80%.

One nice difference is the sql rule assigns context variables from the column names; so in this case, we have both \`cpu\` and \`freemem\` as context variables, but with the index threshold rule we'll only have the cpu value available as \`context.value\`.

Note this expects a server log action with the id of <tt>server-log</tt> to be available, which you can make happen with the following kibana.dev.yml:

    xpack.actions.preconfigured:
      server-log:
        name: 'server log'
        actionTypeId: '.server-log'

Because this is using a 1s interval, you can avoid warnings about that with the config setting:

    xpack.alerting.rules.minimumScheduleInterval.value: '1s'

Once this rule has been added, and the cpu for some of the hosts goes over 0.80, the following server logs will be generated:

    Server log: rule sql rule example triggered for host-1; cpu: 0.8500000238418579; free memory: 340000
    Server log: rule sql rule example triggered for host-2; cpu: 0.949999988079071; free memory: 380000

-----

# kb_profiler 

HTTP endpoints in Kibana to run a CPU profile for specified duration, and obtain a heap snapshot. 

-----

# worker_rule 

Kibana alerting rule that runs the rule as a node Worker. 

-----

# task_grapher 

Looking for some visualizations of task activity over time, but most likely looking purely at alerting rules / connectors, since they have good timing info in the event log, but there is not really anything for task manager.
`;
