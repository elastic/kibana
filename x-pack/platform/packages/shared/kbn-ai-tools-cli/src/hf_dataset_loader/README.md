# HuggingFace Dataset Loader

`loadHuggingFaceDatasets()` loads publicly

A small Kibana Dev CLI script that ingests one or more public HuggingFace datasets into the **Elasticsearch instance discovered from your local Kibana**. It uses the default ELSER v2 endpoint to generate embeddings and index them into your cluster. You can then use these indices for evaluating RAG-based workflows and features.

## Prerequisites

- A running **Kibana** + **Elasticsearch** (the script will auto-discover the base URL using `@kbn/kibana-api-cli`)
- Internet connection – the datasets are downloaded straight from the HF Hub and cached on disk (`./data`) unless `DISABLE_KBN_CLI_CACHE=1`).
- [A HuggingFace access token](https://huggingface.co/docs/hub/en/security-tokens) - this can be acquired by signing up to HF (free).

## Usage

```bash
HUGGING_FACE_ACCESS_TOKEN=<SNIP> \
node --require ./src/setup_node_env/index.js \
  x-pack/platform/packages/shared/kbn-ai-tools-cli/scripts/hf_dataset_loader.ts \
  --datasets beir-trec-covid,beir-msmarco \
  --limit 1000 \
  --clear \
  --kibana-url http://<username>:<password>@localhost:5601
```

### CLI flags

| Flag           | Type      | Description                                                                                           |
| -------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `--datasets`   | `string`  | Comma-separated list of dataset **names** to load. Omit the flag to load **all** predefined datasets. |
| `--limit`      | `number`  | Max docs per dataset (handy while testing). When omitted, all rows will be loaded.                    |
| `--clear`      | `boolean` | Delete the target index **before** indexing. Defaults to `false`.                                     |
| `--kibana-url` | `string`  | Kibana URL to connect to (bypasses auto-discovery when provided).                                     |

## Built-in dataset specs

The script ships with ready-made specifications located in `config.ts`.

Feel free to extend or tweak these specs in `src/hf_dataset_loader/config.ts`.

## OneChat datasets

The loader also supports **OneChat datasets** from the `elastic/OneChatAgent` repository. These are CSV-based datasets with predefined mappings stored in `index-mappings.jsonl` files.

**Note**: To access OneChat datasets, you need to be a member of the Elastic organization on HuggingFace. Sign up with your `@elastic.co` email address to request access (automated process).

### OneChat syntax

Use the format `onechat/<directory>/<dataset>` to load OneChat datasets:

```bash
# Load all OneChat datasets
--datasets onechat/knowledge-base/*

# Load a single OneChat dataset
--datasets onechat/knowledge-base/wix_knowledge_base

# Mix OneChat and regular datasets
--datasets onechat/knowledge-base/wix_knowledge_base,beir-msmarco

# Load multiple OneChat datasets
--datasets onechat/knowledge-base/wix_knowledge_base,onechat/users/user_profiles
```

### How it works

1. The loader fetches `<directory>/index-mappings.jsonl` from the OneChat repository
2. Downloads the corresponding CSV file from `<directory>/datasets/`
3. Creates Elasticsearch indices with the predefined mappings from `index-mappings.jsonl` file.
4. Loads the CSV data into the index.

### Available datasets

Run the loader without `--datasets` to see all available OneChat and regular HuggingFace datasets.

### Naming convention

- Repository file: `knowledge-base/datasets/wix_knowledge_base.csv`
- Loader dataset name: `onechat/knowledge-base/wix_knowledge_base`
- Elasticsearch index: `wix_knowledge_base`

## Disabling local cache

Set the environment variable `DISABLE_KBN_CLI_CACHE=1` to force fresh downloads instead of using the on-disk cache.

## Clearing the cache

Remove the downloaded files and cached documents by deleting the cache directories:

```bash
rm -rf data/hugging_face_dataset_rows
rm -rf data/hugging_face_dataset_embeddings
```
