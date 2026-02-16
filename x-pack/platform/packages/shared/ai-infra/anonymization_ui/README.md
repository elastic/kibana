# @kbn/anonymization-ui

Shared UI package for anonymization profile configuration in Stack Management and embedded solution surfaces.

## Scope

This package provides reusable anonymization UI components, hooks, and shared contracts.

- Reusable composition for Stack Management and solution-hosted surfaces.
- Shared host context contracts (capabilities, services, and active space id).

## Host-provided services contract

Hosts are expected to provide:

- `capabilities`: anonymization visibility and management capability flags.
- `services`: browser services required by the package (for example HTTP and notifications).
- `spaceId`: active Kibana space identifier.

## Ownership boundaries

Package-owned:

- profile management UI primitives and behavior contracts.
- mode derivation (`manage`, `readOnly`, `hidden`) from host context.
- shared API and adapter layer for anonymization profiles endpoints.
- composable profiles components (`ProfilesToolbar`, `ProfilesTable`, `ProfileFlyout`, `DeleteProfileModal`) that hosts can orchestrate.

### Package structure

- `src/profiles/state`: profiles state and feature hooks.
- `src/profiles/components/<sub_component>`: UI sub-components and colocated UI hooks.
- `src/profiles/services`: API clients, query hooks, and lookup services.

Host-owned:

- app routing, page chrome, breadcrumbs, and navigation integration.
- modal or sheet shell and close lifecycle integration.
- host-specific telemetry and feature-flag wiring.

## Current status

The package contains the active anonymization profile UI implementation used by GenAI Settings.
