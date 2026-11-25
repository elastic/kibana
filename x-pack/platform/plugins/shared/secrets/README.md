# Secrets

Stores named secrets that Kibana features can reference without exposing their values.

The plugin is off by default (`xpack.secrets.enabled`) while secrets are in development.

It has no HTTP routes and no UI: the consuming feature owns both, together with the permissions. What the server and the browser share, such as types, name rules and errors, lives in `@kbn/secrets`.
