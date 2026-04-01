# Anonymization plugin

Home of the platform-owned anonymization policy service used by inference-related workflows.

## What this plugin does

The `anonymization` plugin provides server-side storage and retrieval of anonymization profiles, plus
an internal start contract for resolving effective anonymization policy at runtime.

Primary responsibilities:

- Register anonymization feature privileges and route authorization.
- Persist anonymization profiles in a dedicated Kibana system index.
- Manage per-space deterministic salt material through encrypted saved objects.
- Expose a policy service consumed by other plugins (for example, `inference`).

## Location

- Plugin: `x-pack/platform/plugins/shared/anonymization`
- Shared types and helpers: `x-pack/platform/packages/shared/ai-infra/anonymization-common`

## Start contract

The plugin start contract exposes `getPolicyService()`, which returns:

- `resolveEffectivePolicy(namespace, target)` to resolve the effective field-level policy for a target.
- `getProfile(namespace, profileId)` to fetch a single profile.
- `getSalt(namespace)` to obtain deterministic per-space salt material.

Target shape:

- `type`: `data_view` | `index_pattern` | `index`
- `id`: target identifier

## Internal HTTP APIs

Base path: `/internal/anonymization/profiles` (versioned internal API).

- `POST /internal/anonymization/profiles` - create profile
- `GET /internal/anonymization/profiles/_find` - find profiles
- `GET /internal/anonymization/profiles/{id}` - get profile
- `PUT /internal/anonymization/profiles/{id}` - update profile
- `DELETE /internal/anonymization/profiles/{id}` - delete profile

These routes are protected by anonymization feature privileges:

- `read_anonymization`
- `manage_anonymization`

## Storage model

- Profiles are stored in `.kibana-anonymization-profiles`.
- Per-space salt is stored in a hidden encrypted saved object type.
- Profiles are namespace-aware (space-aware).

## Development notes

- Entry point: `server/plugin.ts`
- Routes: `server/routes/profiles.ts`
- Repository: `server/repository/profiles_repository.ts`
- Policy types and constants: `common/index.ts`, `server/types.ts`

Run targeted tests:

```bash
yarn test:jest x-pack/platform/plugins/shared/anonymization
```

Run API integration tests:

```bash
yarn test:ftr --config x-pack/platform/test/api_integration/apis/anonymization/config.ts
```
