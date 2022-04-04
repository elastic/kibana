## ow22_pmuellr On-Week 2022 stuff from Patrick Mueller

### sql_rule

Kibana alerting rule that uses SQL. with the resultant SQL columns selecting
both the alert id (nee: alert instance id, like a host name) and context 
variables.

### kb_profiler

HTTP endpoints in Kibana to run a CPU profile for specified duration, and 
obtain a heap snapshot.

### worker_rule

Kibana alerting rule that runs the rule as a node Worker.

### task_grapher

Looking for some visualizations of task activity over time, but most likely
looking purely at alerting rules / connectors, since they have good timing
info in the event log, but there's not really anything for task manager.