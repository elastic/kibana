# @kbn/agent-builder-surfaces

Rendering of Agent Builder replies on surfaces other than the Kibana UI, such as Slack.

- `spec`: the [Isomer](https://github.com/elastic/isomer) pack Agent Builder specs are written in, and `replyToSpec` to convert a reply into a spec.
- `slack`: `addSlackProjection`, which renders the reply of a Slack round as Block Kit, for the Slack chat event hook.

Specs are derived when a surface needs them, and never stored.
