# Search boost

Lets users balance search performance and cost for the indices and data streams in a serverless
Vector DB project. It registers the **Search boost** app under **Data management → Indices and data
streams**, next to Index Management.

It is off by default (`xpack.searchBoost.enabled: false`) while the feature is built. To work on it,
add `xpack.searchBoost.enabled: true` to `config/kibana.dev.yml` and run a serverless Vector DB
project. Elasticsearch turns the `_boost` APIs off by default, so start it with them on:

```sh
pnpm es serverless --projectType vectordb -E serverless.search.boost_profile.enabled=true
pnpm serverless-vectordb
```

Scout tests use the `search_boost` server config set, which turns on the plugin flag and the
`_boost` APIs. There are API tests (`api/`) and UI tests (`ui/`):

```sh
node scripts/scout start-server --arch serverless --domain vectordb --serverConfigSet search_boost
node scripts/playwright test --config x-pack/platform/plugins/private/search_boost/test/scout_search_boost/api/playwright.config.ts --project local --grep @local-serverless-vectordb
node scripts/playwright test --config x-pack/platform/plugins/private/search_boost/test/scout_search_boost/ui/playwright.config.ts --project local --grep @local-serverless-vectordb
```

Or start the servers and run the tests in one go:

```sh
node scripts/scout run-tests --location local --arch serverless --domain vectordb --config x-pack/platform/plugins/private/search_boost/test/scout_search_boost/api/playwright.config.ts
node scripts/scout run-tests --location local --arch serverless --domain vectordb --config x-pack/platform/plugins/private/search_boost/test/scout_search_boost/ui/playwright.config.ts
```

## Storybook

Stateless components have stories (`*.stories.tsx`) next to them. Core services are mocked in
`.storybook/decorator.tsx`. To start the Storybook:

```sh
pnpm storybook search_boost
```
