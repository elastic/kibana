# @kbn/ml-services

ML services and API providers for Kibana, providing the main service layer for ML functionality.

In this package, these services are implemented framework agnostic, we try to avoid dependencies related to React (Providers, hooks etc.) to isolate concerns and avoid circular dependencies.

## Related Packages

- `@kbn/ml-hooks` - React hooks exposing services from this package.
