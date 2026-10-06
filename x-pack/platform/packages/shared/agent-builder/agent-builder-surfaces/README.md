# @kbn/agent-builder-surfaces

Rendering of Agent Builder replies on surfaces other than the Kibana UI, such as Slack.

- `spec`: the [Isomer](https://github.com/elastic/isomer) pack Agent Builder specs are written in, and `parseSpec` to validate a spec written by the agent. A round's accepted spec is stored on `round.response.spec`.
