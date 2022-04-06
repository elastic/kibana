# Webhook Alerting Rule

Kibana alerting rule that runs the rule via webhook URL supplied as a parameter.

The idea is to see what happens if we break the existing in-process boundary of
rule execution.  Can we create a rule type that actually runs the "meat" of the
rule in a different process.  Useful exercise to explore running rules as
nodejs workers, for instance.

Rule is "Webhook".  Default url is:

    https://elastic:changeme@localhost:5601/_dev/webhook_rule_example

This URL is implemented in this example as well.  It is sent the raw data the
rule is invoked with, and returns data that the rule itself uses to schedule
alert actions.

Query string args of `active`, `off`, and `random` can be used, with no value
(just the arg name), to change the behavior from the  default of `random`:

- `active` - all instances active
- `off` - all instances inactive
- `random` - instances are randomly active

There are 4 possible instances: Alfa, Bravo, Charlie, and Delta.

A counter is maintained in the rule state, and updated and returned from the
webhook.  The counter just counts the number of times the webhook has been
invoked, for this rule, since it last became active.  The counter is
embedded in the `message` context variable.

Edit the rule to change the query param to the available values to see the
effect.

A good message template for the server log is:

    {{alertName}}: {{alertInstanceId}} triggered; {{context.message}}

which will server-log a message like this: 

    webhook alert demo: Delta triggered; webhook invoked 109 times for this rule
