# SQL Alerting Rule 

_part of [on-week 2022 - Patrick Mueller](./README.md)_

Adds a Kibana alerting rule that uses SQL, with the resulting SQL columns
selecting both the alert id (AKA alert instance id, like a host name) and
context variables.

The column named `instanceId` must be included in the selected columns, and
will be used as the instance id of the alert.  The SQL query should only return
one row for each value.

The remaining columns will be used as context variables for the alert.

As an example, we'll build a rule which does a query over an index with
documents in the following fields:

- `@timestamp`
- `host.name`
- `system.cpu.total.norm.pct` _(between 0.0 and 1.0)_
- `system.memory.actual.free` _(bytes)_
- `system.memory.total` _(bytes)_

A command-line tool[`es-apm-sys-sim`](https://github.com/pmuellr/es-apm-sys-sim)
can be used to generate these documents with values changing over time. 

Here's a query you can use with the new rule, which you'll find grouped with
the other Alerting Example rule types, at the top of the list.  Assuming you've
launched Kibana with `--run-examples`.

    SELECT 
      TOP 10 
      host.name AS instanceId, 
      AVG(system.cpu.total.norm.pct) AS cpu, 
      AVG(system.memory.actual.free) AS freemem 
    FROM "es-apm-sys-sim" 
    WHERE 
      ("@timestamp" > (NOW() - INTERVAL 5 SECONDS)) 
    GROUP BY host.name 
    HAVING 
      AVG(system.cpu.total.norm.pct) > 0.80

Add an action, such as server log, with the following value for the message:

    rule {{alertName}} triggered for {{alertInstanceId}}; cpu: {{context.cpu}};
    free memory: {{context.freemem}}      

This SQL query rule is basically the same thing as the index threshold query
where:

    when:          average()
    of:            system.cpu.total.norm.pct
    grouped over:  top 10 'host.name'
    condition:     is above 0.8
    for the last:  5 seconds

The human version: alert when the average of a host's CPU over 5 seconds is > 80%.

One nice difference is the sql rule assigns context variables from the column
names; so in this case, we have both `cpu` and `freemem` as context variables,
but with the index threshold rule we'll only have the cpu value available as
`context.value`.

On the downside, we had to encode the timestamp range into the SQL itself,
whereas it seems like it would be generally nicer to not to have a rule author
have to deal with this.  We could probably make use of the
[`filter` option](https://www.elastic.co/guide/en/elasticsearch/reference/current/sql-search-api.html#sql-search-api-request-body)
to add the time range filter to the rule, however the rule user would also have
to specify the window value in a separate parameter.

Because this is using a 1s interval, you can avoid warnings about that overly short interval with the config setting:

    xpack.alerting.rules.minimumScheduleInterval.value: '1s'

Once this rule has been added, and the cpu for some of the hosts goes over 0.80, the following server logs will be generated:

    Server log: rule sql rule example triggered for host-1; cpu: 0.8500000238418579; free memory: 340000
    Server log: rule sql rule example triggered for host-2; cpu: 0.949999988079071; free memory: 380000

