# Product documentation base plugin


## Kibana API
We expose several APIs to install, update, and uninstall product docs artifacts. Currently, for every Kibana version, we support product docs for 2 Inference IDs: .multilingual-e5-small-elasticsearch | .elser-2-elasticsearch.

### To install
```
POST kbn://internal/product_doc_base/install
{
  "inferenceId": ".multilingual-e5-small-elasticsearch"
}
```
### To update

 Passing `forceUpdate: true` will uninstall and install the product docs to the latest compatible version, even if docs for the same Kibana version are already installed. This is helpful if we need to repair installation or simply upgrade/update docs to the newest possible version even for the same Kibana major-minor version.

Because the operation is expensive, by default, `forceUpdate` is set to false unless user explicitly wants to do that with the API.

To force update all previously installed Inference IDs:
```
POST kbn://internal/product_doc_base/update_all
{
  # Will force update to latest compatible, even for same Kibana version
  "forceUpdate": true
}
```

Optionally, you can specify specific Inference IDs to update:
```
POST kbn://internal/product_doc_base/update_all
{
   # Will only update to latest compatible only if Kibana version is different
  "forceUpdate": false,
  "inferenceIds": [
    ".multilingual-e5-small-elasticsearch",
  ]
}
```
Omit `inferenceIds` if you want to update all previously installed docs, regardless of which Inference ID.
- If ELSER was installed, but not E5 → ELSER docs will be updated
- If E5 was installed, but not ELSER → E5 docs will be updated
- If ELSER was installed, E5 was installed → ELSER & E5 docs will be updated

### To uninstall
```
POST kbn://internal/product_doc_base/uninstall
{
  "inferenceId": ".elser-2-elasticsearch"
}
```


## Run tests

Set up test server
```
node scripts/functional_tests_server.js --config x-pack/platform/test/functional_gen_ai/inference/config.ts
```
Run tests on different terminal
```
node scripts/functional_tests_server.js --config x-pack/platform/test/functional_gen_ai/inference/config.ts --grep='product docs base'
```
