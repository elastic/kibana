# @kbn/agent-builder-common

Common (server+browser) types and utilities for the agentBuilder framework.

## Tool identifier utilities

The package exposes various helper function and typeguard to manipulate and
convert tool identifiers

- `isSerializedToolIdentifier`
- `isStructuredToolIdentifier`
- `isPlainToolIdentifier`
- `toStructuredToolIdentifier`
- `toSerializedToolIdentifier`
- `createBuiltinToolId`

## Error utilities

The package exposes type guards for all agentBuilder error types

- `isAgentBuilderError`
- `isToolNotFoundError`
- `isInternalError`