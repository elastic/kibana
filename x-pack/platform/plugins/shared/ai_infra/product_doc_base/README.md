# Product documentation base plugin

## Overview

This plugin provides APIs to install, update, and uninstall knowledge base artifacts for AI Assistants. It supports two resource types:

- **Product Documentation** (`product_doc`): Elastic product documentation (Kibana, Elasticsearch, Observability, Security)
- **Security Labs** (`security_labs`): Elastic Security Labs content

## Kibana API

All APIs accept an optional `resourceType` parameter. When omitted, it defaults to `product_doc`.

### Resource Types

| Resource Type   | Description                   | Versioning                    |
| --------------- | ----------------------------- | ----------------------------- |
| `product_doc`   | Elastic product documentation | Kibana version (e.g., 8.18)   |
| `security_labs` | Elastic Security Labs content | UTC timestamp (`YYYY.MM.DD-HHMMSS`; legacy `YYYY.MM.DD` still accepted for 9.3/9.4 BWC) |
| `openapi_spec`  | Elastic open api spec         |                               |

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
xpack.productDocBase.artifactRepositoryUrl: 'https://kibana-knowledge-base-artifacts.elastic.co'
```

### Serverless: bundled artifacts

Serverless distributions ship the `latest` product documentation artifacts for every product (plus the newest Security Labs artifact), for both inference IDs serverless resolves the default to (`.jina-embeddings-v5-text-small` and EIS ELSER, i.e. the unsuffixed artifacts), inside the image, under `target/bundled_artifacts` in this plugin, together with an `index.xml` in the same `ListBucketResult` format as the remote repository. The build task `BundleProductDocArtifacts` (`src/dev/build/tasks/product_docs`) downloads them from the storage bucket for serverless platforms only; stateful distributions are unaffected.

On serverless the plugin uses that directory as a `file://` artifact repository and never contacts the remote repository; documentation is refreshed when a new image is rolled out. The repository in use is logged at startup. Without a bundle (local serverless development) the plugin falls back to the remote repository. A non-default `xpack.productDocBase.artifactRepositoryUrl` always takes precedence over the bundle; to force the default remote repository instead of the bundle, set:

```yaml
xpack.productDocBase.useBundledArtifacts: false
```
A `file://` URL pointing at a directory with a bucket `index.xml` and the zips is also accepted. Scout and FTR test
servers default to the tiny stub repository shipped in `@kbn/test-kibana-server` (`PRODUCT_DOC_STUB_REPOSITORY_URL`)
so that CI never downloads the real artifacts; a suite that needs the real documentation must set the CDN URL in its
own config.

Artifact naming conventions:

- Product docs: `kb-product-doc-{product}-{version}.zip`
- Security Labs: `security-labs-{YYYY.MM.DD-HHMMSS}.zip`. Publishes also write a same-bytes ELSER alias `security-labs-{YYYY.MM.DD}.zip` for Kibana **9.3 / 9.4** BWC — those releases only parse date-only names from the original Security Labs ship ([#246099](https://github.com/elastic/kibana/pull/246099)). The alias can be dropped once 9.3/9.4 are out of support.

## Run tests

### Unit tests

Unit tests cover the artifact-builder processing pipeline (`processDocuments`) — no running
Kibana or Elasticsearch required.

```
node scripts/jest x-pack/packages/ai-infra/product-doc-artifact-builder/src/tasks/process_documents.test.ts
```

### Functional tests

Functional tests live in the `functional_gen_ai` inference suite. There are two suites:

| Suite | `--grep` pattern | What it tests |
|---|---|---|
| Installation lifecycle | `product docs base` | install / update / uninstall flows for ELSER and Jina |
| Search quality | `product docs search quality` | document counts + query relevance after install |

The installation suite tests both ELSER (always available) and Jina via EIS (requires Cloud
Connected Mode). The Jina tests read `KIBANA_EIS_CCM_API_KEY` from the environment — set by CI
from Vault, or locally from your team's secret store. Without it, only the ELSER tests pass; the
`Jina (via EIS)` describe block fails immediately.

**Step 1 — start the test server** (terminal 1):

```
node scripts/functional_tests_server.js --config x-pack/platform/test/functional_gen_ai/inference/config.ts
```

**Step 2 — run a suite** (terminal 2):

```
# Installation lifecycle only
node scripts/functional_test_runner.js --config x-pack/platform/test/functional_gen_ai/inference/config.ts --grep='product docs base'

# Search quality only
node scripts/functional_test_runner.js --config x-pack/platform/test/functional_gen_ai/inference/config.ts --grep='product docs search quality'

# Both suites
node scripts/functional_test_runner.js --config x-pack/platform/test/functional_gen_ai/inference/config.ts --grep='product docs'
```
