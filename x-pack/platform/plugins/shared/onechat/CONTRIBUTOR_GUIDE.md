# Agent Builder - contributor guide

This document is intended for platform contributors to the Agent Builder framework,
explains the base concepts and how to register "platform" tools and agents.

(But please also check the [README.md](./README.md) too for more general information about Agent Builder)

## Documentation

- [Registering Built-in Tools](./docs/tools.md)
- [Registering Built-in Agents](./docs/agents.md)
- [Registering Attachment Types](./docs/attachments.md)

## Difference between built-in tools and agents and their user-created counterparts

Platform and user-created tools and agents share the same concepts and API, but have some notable differences:

### read-only

Platform tools and agents (including those registered via code) are read-only, and cannot be modified or deleted by the user.

### space awareness

- User-created tools are **space-aware** (accessible exclusively from the space they were created in).
- Platform tools and agents are **space agnostic**: they are accessible from any space.
  - _(as long as the user has access to it and the feature is enabled for that space)_

### id namespacing

- User-created tools and agents are free to use any id they want, as long as they are unique and not inside platform reserved namespaces.
- Platform tools and agents should be namespaced, using reserved namespaces (e.g. `platform.core.*`)
- This is meant both for categorization, and to avoid id collisions (e.g. we introduce in a later version a tool with the same id as a tool a user created)

### built-in tool type

Platform tools can use the internal `builtin` tool type, allowing them to register tools executing arbitrary code from
the Kibana server, where user-created tools can only use the other (serializable) tool types.
