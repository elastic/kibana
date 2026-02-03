# Product documentation base plugin

## Overview

This plugin provides APIs to install, update, and uninstall knowledge base artifacts for AI Assistants. It supports two resource types:

- **Product Documentation** (`product_doc`): Elastic product documentation (Kibana, Elasticsearch, Observability, Security)
- **Security Labs** (`security_labs`): Elastic Security Labs content

## Kibana API

All APIs accept an optional `resourceType` parameter. When omitted, it defaults to `product_doc`.

### Resource Types

| Resource Type | Description | Versioning |
|---------------|-------------|------------|
| `product_doc` | Elastic product documentation | Kibana version (e.g., 8.18) |
| `security_labs` | Elastic Security Labs content | Date-based (e.g., 2024.12.11) |

### To install

**Product Documentation (default):**
```
POST kbn://internal/product_doc_base/install
{
  "inferenceId": ".multilingual-e5-small-elasticsearch"
}
```

**Security Labs:**
```
POST kbn://internal/product_doc_base/install
{
  "inferenceId": ".elser-2-elasticsearch",
  "resourceType": "security_labs"
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

**Product Documentation (default):**
```
POST kbn://internal/product_doc_base/uninstall
{
  "inferenceId": ".elser-2-elasticsearch"
}
```

**Security Labs:**
```
POST kbn://internal/product_doc_base/uninstall
{
  "inferenceId": ".elser-2-elasticsearch",
  "resourceType": "security_labs"
}
```

### To check status

**Product Documentation (default):**
```
GET kbn://internal/product_doc_base/status?inferenceId=.elser-2-elasticsearch
```

**Security Labs:**
```
GET kbn://internal/product_doc_base/status?inferenceId=.elser-2-elasticsearch&resourceType=security_labs
```

## Artifact Repository

Both product documentation and Security Labs artifacts are hosted on the same CDN. The repository URL is configurable via:

```yaml
xpack.productDocBase.artifactRepositoryUrl: "https://kibana-knowledge-base-artifacts.elastic.co"
```

Artifact naming conventions:
- Product docs: `kb-product-doc-{product}-{version}.zip`
- Security Labs: `security-labs-{YYYY.MM.DD}.zip`

## Run tests

Set up test server
```
node scripts/functional_tests_server.js --config x-pack/platform/test/functional_gen_ai/inference/config.ts
```
Run tests on different terminal
```
node scripts/functional_tests_server.js --config x-pack/platform/test/functional_gen_ai/inference/config.ts --grep='product docs base'
```
