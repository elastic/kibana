# @kbn/secrets

Types and rules for named secrets that Kibana features can reference without exposing their values.

A secret is a named entry scoped to a space. Its value is stored encrypted in Kibana.

It is a common package, so that the browser can share the types, limits and name rules with the server. It must not import server-only code: anything that needs the request lives in the `secrets` plugin.
