# @kbn/agent-builder-surfaces

Rendering of Agent Builder replies on surfaces other than the Kibana UI, such as Slack.

- `spec`: the [Isomer](https://github.com/elastic/isomer) pack Agent Builder specs are written in, `replyToSpec` to convert a reply into a spec, and `resolveSpec` to replace its attachment nodes with what their type's `toSpec` mapping returns.
- `projections`: `addIsomerProjections`, which adds the projection of the round's origin to an event, from a registry of projections by origin type. Used for the `round_complete` event delivered to the callback URL.
- `slack`: the Slack projection, which renders the reply as Block Kit under `projection.slack`.

Specs are derived when a surface needs them, and never stored.
