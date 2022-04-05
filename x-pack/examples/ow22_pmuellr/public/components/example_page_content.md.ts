/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const x = 'a';

export const content = `
# SQL Alerting Rule 

Adds a Kibana alerting rule that uses SQL, with the resulting SQL columns selecting both the alert id (AKA alert instance id, like a host name) and context variables.

The column named \`instanceId\` must be included in the selected columns, and will be used as the instance id of the alert.  The SQL query should only return one row for each value.

The remaining columns will be used as context variables for the alert.

As an example, we'll build a rule which does a query over an index with documents in the following fields:

- \`@timestamp\`
- \`host.name\`
- \`system.cpu.total.norm.pct\` _(between 0.0 and 1.0)_
- \`system.memory.actual.free\` _(bytes)_
- \`system.memory.total\` _(bytes)_

A command-line tool[\`es-apm-sys-sim\`](https://github.com/pmuellr/es-apm-sys-sim) can be used to generate these documents with values changing over time. 

Here's a query you can use with the new rule, which you'll find grouped with the other Alerting Example rule types, at the top of the list.  Assuming you've launched Kibana with \`--run-examples\`.

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

    rule {{alertName}} triggered for {{alertInstanceId}}; cpu: {{context.cpu}}; free memory: {{context.freemem}}      

This SQL query rule is basically the same thing as the index threshold query where:

    when:          average()
    of:            system.cpu.total.norm.pct
    grouped over:  top 10 'host.name'
    condition:     is above 0.8
    for the last:  5 seconds

The human version: alert when the average of a host's CPU over 5 seconds is > 80%.

One nice difference is the sql rule assigns context variables from the column names; so in this case, we have both \`cpu\` and \`freemem\` as context variables, but with the index threshold rule we'll only have the cpu value available as \`context.value\`.

On the downside, we had to encode the timestamp range into the SQL itself, whereas it seems like it would be generally nicer to not to have a rule author have to deal with this.  We could probably make use of the [\`filter\` option](https://www.elastic.co/guide/en/elasticsearch/reference/current/sql-search-api.html#sql-search-api-request-body) to add the time range filter to the rule, however the rule user would also have to specify the window value in a separate parameter.

Because this is using a 1s interval, you can avoid warnings about that overly short interval with the config setting:

    xpack.alerting.rules.minimumScheduleInterval.value: '1s'

Once this rule has been added, and the cpu for some of the hosts goes over 0.80, the following server logs will be generated:

    Server log: rule sql rule example triggered for host-1; cpu: 0.8500000238418579; free memory: 340000
    Server log: rule sql rule example triggered for host-2; cpu: 0.949999988079071; free memory: 380000

-----

# V8 Profiler

HTTP endpoints in Kibana to run a CPU profile for specified duration, and obtain a heap snapshot. 

_Note: at the time of this writing, there appears to be something broken with the heap snapshots.  They never finish, on the server side._

The endpoints are:

    /_dev/cpu_profile?duration=(seconds)&interval=(microseconds)
    /_dev/heap_snapshot

Try them right now!

- [\`/_dev/cpu_profile?duration=15&interval=100\`](/_dev/cpu_profile?duration=15&interval=100)
- [\`/_dev/heap_snapshot\`](/_dev/heap_snapshot)

When using curl, you can use the \`-OJ\` options, which:

- \`-O\` \`--remote-name\`: use the server-specified name for this download
- \`-J\` \`--remote-header-name\`: use the \`Content-Disposition\` as the name of the download

The files generated will be:

    MM-DD_hh-mm-ss.cpuprofile
    MM-DD_hh-mm-ss.heapsnapshot

These filetypes are the ones expected by various V8 tools that can read these.

You can use these URLs in your browser, and the files will be saved with the generated names.

### profile / heap snapshot readers

The traditional tools used to view these are part of Chrome Dev Tools (CDT).  

For CPU profiles, open Chrome Dev Tools and then click on the "Performance" menu.  You should be able to drop a file right from Finder / Explorer onto the CDT window, and then get the visualization of the profile.  If you downloaded the profile right from the browser, using the URL in the URL bar, you can drop the download file from the download status button right into CDT.

For heap snapshots, open the "Memory" tool instead, and note that it does not appear to support drag and drop from a file.  You'll need to right click on "Profiles" in the left-top pane, to see the "Load..." menu, which will allow you to select a file via a file prompted.

For heap snapshots, CDT is the only tool I know of that can read these, and it's not an easy to understand tool.  :-)

For CPU profiles, there are other options.

VSCode now supports \`.cpuprofile\` files directly, displaying them as a table of function timings.  There is also an extension available to display flame charts, installed by clicking on the grey-ed out "flame" button on the top-right of the cpu profile view.

An alternate view of CPU profiles, which organizes files based on "packages", is available at https://pmuellr.github.io/no-pro/ .  It also supports drag-n-drop of CPU profile files.  Note that you can get more directories to show up as "packages", by bringing up CDT and running the following code:

    localStorage['fake-packages-dirs'] = "x-pack/plugins,packages"

-----

# Webhook Alerting Rule

Kibana alerting rule that runs the rule via webhook URL supplied as a parameter.

-----

# Task Grapher 

Looking for some visualizations of task activity over time, but most likely looking purely at alerting rules / connectors, since they have good timing info in the event log, but there is not really anything for task manager.
`;
