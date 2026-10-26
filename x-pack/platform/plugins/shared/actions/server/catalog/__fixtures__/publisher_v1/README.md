# Publisher v1 fixture

Copied from elastic/workflows PR #84, branch `feat/connector-catalog-publisher-v1`, commit `a5002c6c250095b696dce42a2360d124abd67f01`.

Build command, run from a checkout of that branch:

```
npm run build:connectors
```

Copy `dist/connectors/v1/catalog.json`, the connector YAML files, and the content-addressed icons into this directory.

`catalog.json` is unsigned. `publisher_compat.test.ts` signs those exact bytes with a generated Ed25519 key. Do not commit `catalog.json.sig`.
