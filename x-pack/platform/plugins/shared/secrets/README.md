# Secrets

Stores named secrets that Kibana features can reference without exposing their values.

This plugin is a thin shell: it wires the logic in `@kbn/secrets` into Kibana and exposes it to other plugins.
It has no HTTP routes and no UI; the consuming feature owns both, together with the permissions.
