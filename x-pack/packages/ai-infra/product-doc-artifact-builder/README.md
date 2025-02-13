# @kbn/product-doc-artifact-builder

Script to build the knowledge base artifacts.

## How to run

```
node scripts/build_product_doc_artifacts.js --stack-version {version} --product-name {product}
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