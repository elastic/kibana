# @kbn/secrets-ui

The browser side of managing the secrets of a consumer of the secrets plugin. It never handles the value of a secret that is already stored.

Each consumer registers its own routes and passes them to `createSecretsApi`. The hooks need a `QueryClientProvider`:

```tsx
const api = useMemo(() => createSecretsApi({ http, routes }), [http]);
const { data } = useSecrets(api);
```

All the hooks of one consumer share one query key, so that a change refreshes whatever else reads the secrets (an editor that completes their names).
