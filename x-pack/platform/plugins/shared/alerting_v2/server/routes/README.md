# Routes

HTTP route handlers for the alerting v2 plugin.

## Testing policy

Route handlers are thin: they validate the request against a schema, call a
client or service, shape the result, and map errors to HTTP responses. That
behaviour is verified end-to-end by the Scout API integration tests under
`test/scout/**/api/tests`, which exercise real requests against a running
Kibana — including status codes, request/response schema contracts,
authorization, validation errors, pagination, and the error branches.

For this reason we do **not** keep *handler-wiring* unit tests — ones that
instantiate a route, mock its clients, and assert the handler forwards and
shapes correctly. When you add or change a route handler, cover it with a Scout
API spec instead.

### What still has unit tests

Pure functions and shared route infrastructure keep their unit tests, because
they are either not reachable through a single endpoint, or are cheaper and more
exhaustive to pin down directly than through a running stack:

- **Pure request/response mappers** (the `to*Args` / `to*Response` helpers that
  translate snake_case ↔ camelCase and reshape results). These are unit tested
  directly — a few live in a `*_route.test.ts` next to the route that exports
  them, but they instantiate no route and mock no client.
- the base route (`base_alerting_route.ts`) and request-validation helpers
  (`compute_route_validate.ts`, `zod_request_validation.ts`,
  `deep_merge_route_options.ts`, `derive_error_code.ts`, `route_access.ts`);
- the OAS example payloads (`*_oas_examples.test.ts`), which assert the
  documented examples stay valid against their schemas.
