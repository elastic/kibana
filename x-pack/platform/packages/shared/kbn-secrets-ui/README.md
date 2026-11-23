# @kbn/secrets-ui

The browser side of managing the secrets of a consumer of the secrets plugin. It never handles the value of a secret that is already stored.

Each consumer registers its own routes and passes them to `createSecretsApi`. The hooks need a `QueryClientProvider`:

```tsx
const api = useMemo(() => createSecretsApi({ http, routes }), [http]);
const { data } = useSecrets(api);
```

`SecretsManagement` renders the secrets of a consumer in a table, and creates, replaces, deletes and tests them. A secret takes its value from Kibana or from a connector. The consumer decides who sees it, and passes `getSecretReference` to say how a secret is referred to by name:

```tsx
<SecretsManagement
  api={api}
  notifications={notifications}
  getSecretReference={(name) => `{{ secrets.${name} }}`}
/>
```

All the hooks of one consumer share one query key, so that a change refreshes whatever else reads the secrets (an editor that completes their names).
