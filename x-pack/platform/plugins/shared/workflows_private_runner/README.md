# workflowsPrivateRunner

Runs connector HTTP requests from Elastic Agents inside customer private networks ("private locations"), so connectors can reach services that resolve only through private DNS.

A private location is a Fleet agent policy whose agents run the `workflow/http` input. When a connector configured with `privateLocation` executes, this plugin:

1. Picks an online agent in that policy (in the connector's space) that reports a healthy `workflow/http` component.
2. Creates a Fleet `INPUT_ACTION` with `input_type: workflow/http` targeting that agent.
3. Waits for the agent's ack in `.fleet-actions-results`, then reads the response document from `logs-workflow_runner.http-*` by action id.

The plugin registers itself with `stackConnectors.registerPrivateLocationRunner`. It is a separate plugin because `stackConnectors` cannot depend on `fleet` without creating a dependency cycle.

Currently only the HTTP connector (`.http`, used by Workflows `type: http` steps) supports private locations: through `config.privateLocation` on a saved connector, or the `private_location` param for steps without `connector-id`.
