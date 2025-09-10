# Product documentation base plugin


## Kibana API
We expose several APIs to install, update, and uninstall product docs artifacts. Currently, for every Kibana version, we support 2 product docs for 2 Inference IDs.

### To install
```
POST kbn://internal/product_doc_base/install
{
  "inferenceId": ".multilingual-e5-small-elasticsearch"
}
```
### To update

Occasionally, we need to repair installation or simply upgrade/update docs even for the same Kibana major-minor version. Passing `forceUpdate: true` will uninstall and install the product docs to the latest compatatible version. Because the operation is expensive, by default, forceUpdate is set to false unless user explicitly wants to do that with the API.

To force update all previously installed Inference Ids:
```
POST kbn://internal/product_doc_base/update_all
{
  # Will force update to latest compatible, even for same Kibana version
  "forceUpdate": true
}
```
Optionally, you can pass in Inference IDs:
```
POST kbn://internal/product_doc_base/update_all
{
   # Will only update to latest compatible, if Kibana version is different
  "forceUpdate": false,
  "inferenceIds": [
    ".multilingual-e5-small-elasticsearch"
  ]
}

```
### To uninstall
```
POST kbn://internal/product_doc_base/uninstall
{
  "inferenceId": ".multilingual-e5-small-elasticsearch"
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
