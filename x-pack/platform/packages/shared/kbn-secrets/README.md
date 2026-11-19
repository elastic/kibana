# @kbn/secrets

Types and logic for named secrets that Kibana features can reference without exposing their values.

A secret is a named entry scoped to a space. Its value is either stored encrypted in Kibana or fetched at
run time from an external secret manager through a connector. Consumers never need to know which.

This package has no plugin dependencies: collaborators are passed in. The `secrets` plugin wires it into Kibana.
