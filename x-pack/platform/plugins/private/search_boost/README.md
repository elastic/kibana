# Search boost

Lets users balance search performance and cost for the indices and data streams in a serverless
Vector DB project. It registers the **Search boost** app under **Data management → Indices and data
streams**, next to Index Management.

It is off by default (`xpack.searchBoost.enabled: false`) while the feature is built. To work on it,
add `xpack.searchBoost.enabled: true` to `config/kibana.dev.yml` and run a serverless Vector DB
project:

```sh
pnpm es serverless --projectType vectordb
pnpm serverless-vectordb
```

Scout tests use the `search_boost` server config set, which turns the flag on:

```sh
node scripts/scout start-server --arch serverless --domain vectordb --serverConfigSet search_boost
node scripts/playwright test --config x-pack/platform/plugins/private/search_boost/test/scout_search_boost/ui/playwright.config.ts --project local --grep @local-serverless-vectordb
```

Or start the servers and run the tests in one go:

```sh
node scripts/scout run-tests --location local --arch serverless --domain vectordb --config x-pack/platform/plugins/private/search_boost/test/scout_search_boost/ui/playwright.config.ts
```
