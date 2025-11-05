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
  --clear
```

### CLI flags

| Flag         | Type      | Description                                                                                           |
| ------------ | --------- | ----------------------------------------------------------------------------------------------------- |
| `--datasets` | `string`  | Comma-separated list of dataset **names** to load. Omit the flag to load **all** predefined datasets. |
| `--limit`    | `number`  | Max docs per dataset (handy while testing). Defaults to 1k.                                           |
| `--clear`    | `boolean` | Delete the target index **before** indexing. Defaults to `false`.                                     |

## Built-in dataset specs

The script ships with ready-made specifications located in `config.ts`.

Feel free to extend or tweak these specs in `src/hf_dataset_loader/config.ts`.

## Disabling local cache

Set the environment variable `DISABLE_KBN_CLI_CACHE=1` to force fresh downloads instead of using the on-disk cache.
