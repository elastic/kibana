# @kbn/product-doc-artifact-builder

Script to build the knowledge base artifacts.

## How to run

yarn es snapshot --license trial

node scripts/kibana --dev --no-base-path


```
node scripts/build_product_doc_artifacts.js --stack-version {version} --product-name {product}
```

Example:

```
node scripts/build_product_doc_artifacts.js --product-name=security --stack-version=8.18  --inference-id=.multilingual-e5-small-elasticsearch
```

### parameters

#### `stack-version`:

the stack version to generate the artifacts for.

#### `product-name`:

(multi-value) the list of products to generate artifacts for.

possible values:
- "kibana"
- "elasticsearch"
- "observability"
- "security"

#### `target-folder`:

The folder to generate the artifacts in.

Defaults to `{REPO_ROOT}/build-kb-artifacts`.

#### `build-folder`:

The folder to use for temporary files.

#### inference-id:

The inference endpoint to use to generate the embeddings. If the inference ID provided and is not the ELSER default, the artifacts will be generated with `{artifactName}--{inference-id}.zip`. Note the double dash before inference-id.


Defaults to `{REPO_ROOT}/build/temp-kb-artifacts`

#### Cluster infos

- params for the source cluster:
`sourceClusterUrl` / env.KIBANA_SOURCE_CLUSTER_URL
`sourceClusterUsername` / env.KIBANA_SOURCE_CLUSTER_USERNAME
`sourceClusterPassword` / env.KIBANA_SOURCE_CLUSTER_PASSWORD

- params for the embedding cluster:
`embeddingClusterUrl` / env.KIBANA_EMBEDDING_CLUSTER_URL
`embeddingClusterUsername` / env.KIBANA_EMBEDDING_CLUSTER_USERNAME
`embeddingClusterPassword` / env.KIBANA_EMBEDDING_CLUSTER_PASSWORD

- params for the inference endpoint:
`inferenceId`

## Building OpenAPI Artifacts

The `build_openapi_artifacts.js` script builds knowledge base artifacts from OpenAPI specifications for Elasticsearch and Kibana.

### How to run

```
node scripts/build_openapi_artifacts.js --stack-version {version} [options]
```

Example:

```
node scripts/build_openapi_artifacts.js --stack-version=9.4 --embedding-cluster-url=http://localhost:9200 --embedding-cluster-username=elastic --embedding-cluster-password=changeme
```

For multilingual, add
--inference-id=.multilingual-e5-small-elasticsearch

### Parameters

#### `stack-version`:

The stack version to generate the artifacts for.

**Default:** `latest`

#### `target-folder`:

The folder to generate the artifacts in.

**Default:** `{REPO_ROOT}/build/kb-artifacts`

#### `build-folder`:

The folder to use for temporary files.

**Default:** `{REPO_ROOT}/build/temp-kb-artifacts`

#### `embedding-cluster-url`:

**(Required)** The URL of the Elasticsearch cluster used for generating embeddings.

Can also be set via environment variable: `KIBANA_EMBEDDING_CLUSTER_URL`

#### `embedding-cluster-username`:

The username for the embedding cluster.

Can also be set via environment variable: `KIBANA_EMBEDDING_CLUSTER_USERNAME`

#### `embedding-cluster-password`:

The password for the embedding cluster.

Can also be set via environment variable: `KIBANA_EMBEDDING_CLUSTER_PASSWORD`

#### `inference-id`:

The inference endpoint ID to use for generating embeddings. The script processes OpenAPI specs for both Elasticsearch and Kibana, and creates combined artifacts.

**Default:** `.elser-2-elasticsearch` (ELSER v2)

### What it does

The script:

1. Downloads OpenAPI specifications for Elasticsearch and Kibana
2. Ingests the OpenAPI specs into Elasticsearch indices with embeddings:
   - `kibana_ai_openapi_spec_elasticsearch` for Elasticsearch API specs
   - `kibana_ai_openapi_spec_kibana` for Kibana API specs
3. Creates chunk files from the ingested specs
4. Generates a combined OpenAPI artifact ZIP file in the target folder

The generated artifact can be used to provide API documentation context to AI assistants and knowledge base systems.
