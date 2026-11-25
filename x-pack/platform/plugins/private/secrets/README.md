# Secrets

Stores named secrets that Kibana features can reference without exposing their values.

The plugin is off by default (`xpack.secrets.enabled`) while secrets are in development.

It has no HTTP routes and no UI: the consuming feature owns both, together with the permissions. What the server and the browser share, such as types, name rules and errors, lives in `@kbn/secrets`.

## Running it locally

Add to `config/kibana.dev.yml`:

```yaml
xpack.secrets.enabled: true
```

Secret values are encrypted, so Kibana also needs `xpack.encryptedSavedObjects.encryptionKey`. When running from source, the encrypted saved objects plugin defaults it to a fixed development key; a distribution build has no default.

Once secrets are stored, keep the plugin enabled. With the plugin disabled, the `secret` type is unknown and the next upgrade stops at the saved object migration until the plugin is enabled again.
