## Elasticsearch API Documentation Generator and Ingest

This folder provides two scripts to:

1. **Generate** a JSON file (`documents.json`) from an Elasticsearch OpenAPI specification.
2. **Ingest** those generated documents into an Elasticsearch index for search or semantic use.

---

### Prerequisites

- **Elasticsearch** running and accessible  
   (default: `http://elastic:changeme@127.0.0.1:9200/`)
- An **OpenAPI JSON** file describing Elasticsearch endpoints  
   (default path:  
   `x-pack/platform/plugins/shared/observability_ai_assistant/script/es_api_doc/elasticsearch_openapi_source.json`)

---

### 1. Generate Documentation

The first script reads the OpenAPI file and outputs a `documents.json` containing a flattened list of endpoint definitions.

**Run:**

```bash
npx ts-node x-pack/platform/plugins/shared/observability_ai_assistant/script/es_api_doc/generate_docs.ts
```

**What it does:**

- Parses `elasticsearch_openapi_source.json`
- Resolves parameter and response schema `$refs`
- Writes `documents.json` to the same directory

---

### 2. Ingest Into Elasticsearch

The second script indexes the generated documents into Elasticsearch.

**Run:**

```bash
npx ts-node x-pack/platform/plugins/shared/observability_ai_assistant/script/es_api_doc/ingest_docs.ts
```

**What it does:**

- Reads `documents.json`
- Connects to Elasticsearch (`http://elastic:changeme@127.0.0.1:9200/`)
- Creates an index called `kibana_ai_es_api_doc` (if it doesn’t exist) with the following mapping:
- Performs a bulk ingest of all documents
