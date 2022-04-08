# Webhook Alerting Rule

_part of [on-week 2022@1 - Patrick Mueller](./README.md)_

Kibana alerting rule that runs the rule via webhook URL supplied as a parameter.

The idea is to see what happens if we break the existing in-process boundary of
rule execution.  Can we create a rule type that actually runs the "meat" of the
rule in a different process?  Useful exercise to explore running rules as
nodejs workers, for instance.

You'll find the rule type grouped with
the other Alerting Example rule types, at the top of the list.  Assuming you've
launched Kibana with `--run-examples`.

The rule type is "Webhook".  It takes a single parameter `url`, whose default is:

    https://elastic:changeme@localhost:5601/_dev/webhook_rule_example

This URL is implemented in this example as well.  It is sent the raw data the
rule is invoked with, and returns data that the rule itself uses to schedule
alert actions.

Query string args for that URL are `active`, `off`, and `random`, with no value
(just the arg name), to change the behavior from the  default of `random`:

- `active` - all instances active
- `off` - all instances inactive
- `random` - instances are randomly active

There are 4 possible instances: Alfa, Bravo, Charlie, and Delta.

A counter is maintained in the rule state, and updated and returned from the
webhook.  The counter just counts the number of times the webhook has been
invoked, for this rule, since it last became active.  The counter value is
included in the `message` context variable.

Edit the rule to change the query param to the available values to see the
effect.

A good message template for the server log is:

    {{alertName}}: {{alertInstanceId}} triggered; {{context.message}}

which will server-log a message like this: 

    webhook alert demo: Delta triggered; webhook invoked 109 times for this rule

So, the example doesn't do much :-).  But the main idea is to show it's
possible to externalize an alerting rule execution, for at least as far
as I pushed it.

There's plenty of missing functionality:

- nice client side library mirroring our "instance" methods, to schedule
  actions, unschedule them, etc.  With the code today, this information
  needs to be encoded, by hand, in the webhook response.
- authentication - should we provide the API key to the webhook?  Yikes!
- lots of things not supported:
  - timeouts
  - providing context for recovered instances
  - instance state

I think these are all solveable issues, mostly by sending more data
to the webhook.  API key seems nasty.  Thinking no. :-)

## relevant code

https://github.com/pmuellr/kibana/blob/7e3da41a3787b60ef56c925c67f163686616e3ee/x-pack/examples/ow22_pmuellr/server/rule_types/webhook_rule.ts#L1-L120