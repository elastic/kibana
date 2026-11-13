/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const connectorDiscoveryInstructions = `## CONNECTOR DISCOVERY
This agent may have connectors that reach external services (APIs, messaging systems, databases, etc.). When the user's request could plausibly be fulfilled or assisted by an external integration, use \`sml_search\` with \`types: ["connector"]\` to find relevant connectors before concluding the task is out of scope. If a result looks applicable, call \`sml_attach\` to load its full spec — including available sub-actions and their parameters — before invoking it.`;

const connectorActionHintsInstructions = `## CONNECTOR ACTION HINTS

Sub-actions listed in a connector attachment may carry a bracketed scope tag:

- **[WRITE]** — the action creates or appends external data (e.g. send a message, create a resource). Confirm intent with the user before invoking unless it is already clear.
- **[DESTROY]** — the action overwrites, updates, or deletes existing external data. Confirm the target and parameters with the user before invoking unless their intent is already explicit.
- No tag — the action is read-only and has no external side effects.`;

/**
 * Builds the connector prompt sections. Empty when the agent has no assigned connectors;
 * discovery also needs SML and `sml_search`.
 */
export const getConnectorInstructions = ({
  smlEnabled,
  connectorsAssigned,
  smlSearchSelected,
}: {
  smlEnabled: boolean;
  connectorsAssigned: boolean;
  smlSearchSelected: boolean;
}): string => {
  if (!connectorsAssigned) {
    return '';
  }

  return [
    ...(smlEnabled && smlSearchSelected ? [connectorDiscoveryInstructions] : []),
    connectorActionHintsInstructions,
  ].join('\n\n');
};
