---
name: vector-hybrid-search
description:
  Complete guide for building vector search, hybrid search, and using Elasticsearch as a vector store for AI pipelines.
  Covers the full decision tree from deployment type through production optimization and RAG extension. Use when a
  developer wants semantic search, hybrid BM25+vector search, kNN, embeddings, RAG, or Elasticsearch as a vector store
  for LangChain/LlamaIndex.
---

# Vector & Hybrid Search Guide

## Consumer Fork

Before any other decision, establish who consumes the search results. If the conversation hasn't answered it yet, open
with: "What are you building — a search experience for users, or a retrieval backend for an AI pipeline like RAG or
LangChain?"

- **AI pipeline** (code consumes results) → LangChain, LlamaIndex, custom RAG, agent memory, recommendations
- **Human-facing search** (people type queries) → search bar, results page, filters, autocomplete

This determines Decision I (App Integration) and whether to offer a frontend at the end.

---

## Phase 1 — Planning & Decision-Making

### Step 1.1: Define Use Case

Ask what they're building. Listen for:

| Signal                                                                       | Use Case                           |
| ---------------------------------------------------------------------------- | ---------------------------------- |
| "semantic search", "meaning-based", "natural language"                       | Semantic search                    |
| "BM25 + vector", "hybrid", "keyword and semantic"                            | Hybrid search                      |
| "RAG", "chatbot", "Q&A over documents"                                       | RAG — use rag-chatbot skill        |
| "LangChain", "LlamaIndex", "vector store", "vector database", "agent memory" | AI pipeline / vector store         |
| "recommendations", "similar items"                                           | Vector similarity                  |
| "image search", "multimodal"                                                 | Dense vector with image embeddings |

**Scale check:** If the developer indicates >1M documents, >10GB, or cost sensitivity, flag quantization early:

> "With that volume, choose quantization now — it affects the mapping and requires reindexing to add later. `int8_hnsw`
> is the safe default (~4x memory reduction, minimal recall impact)."

### Decision A: Deployment Type

| Option                             | Resolves                             |
| ---------------------------------- | ------------------------------------ |
| **A1: Elastic Cloud Serverless**   | J1 (automatic scaling), K1 (AutoOps) |
| **A2: Elastic Cloud Hosted (ECH)** | J2 (policy-based scaling), K1 or K2  |
| **A3: Self-Managed**               | J3 (manual scaling), K2 or K3        |

### Decision B: Embedding Strategy

**Routing questions** — ask first to narrow the options:

1. "Are you already generating embeddings?" → Yes → briefly offer `semantic_text` as alternative. If they prefer control
   → C2/C3 + D2, skip B.
2. "What version?" → Below 8.15 → `semantic_text` unavailable, skip C1
3. "Specific embedding model needed?" → Yes + not supported by inference API → C2 + D2

| Option                          | When to Use                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **B1: Built-in Models via EIS** | Default for Cloud (Serverless/ECH) on 8.15+; self-managed on 9.3+ via Cloud Connect                      |
| **B1b: Built-in on ML Nodes**   | Self-managed <9.3 (no Cloud Connect); or when dedicated ML node capacity preferred                       |
| **B2: Third-Party Service**     | Existing model contract or specific model needed (OpenAI, Cohere, Bedrock, Azure AI, Google AI, Mistral) |
| **B3: Self-Hosted Model**       | Custom fine-tuned models — upload via Eland, deploy on ML nodes                                          |

**Default recommendation:** B1 (EIS) — no infrastructure to manage, no external API key needed.

---

## Phase 2 — Data Modeling & Ingestion

### Decision C: Vector Field Type

| Option                  | When to Use                                                       | Notes                                                           |
| ----------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| **C1: `semantic_text`** | 8.15+, using inference endpoint, no existing vectors              | **Default** — auto chunking, auto embedding, no ingest pipeline |
| **C2: `dense_vector`**  | Bringing own vectors, need dims/similarity/HNSW control, pre-8.15 | Manual embedding at ingest and query time                       |
| **C3: `sparse_vector`** | ELSER manual workflow, need token weight maps                     | Running ELSER outside `semantic_text`                           |

C1 bypasses Decision D — `semantic_text` handles embedding via the bound inference endpoint. If C1, skip to Configure
Chunking.

#### C1: `semantic_text` Mapping

**Minimal (works out of the box on Serverless — uses the platform default model, currently Jina):**

```json
PUT /my-index
{
  "mappings": {
    "properties": {
      "content": { "type": "semantic_text" },
      "title": { "type": "text" },
      "category": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

**With a specific inference endpoint:**

```json
PUT /my-index
{
  "mappings": {
    "properties": {
      "content": {
        "type": "semantic_text",
        "inference_id": "my-inference-endpoint"
      }
    }
  }
}
```

Create the inference endpoint first:

```json
PUT _inference/text_embedding/my-inference-endpoint
{
  "service": "elastic",
  "service_settings": {
    "model_id": "<current-eis-embedding-model-id>"
  }
}
```

> **Always fetch the current model list from
> [EIS docs](https://www.elastic.co/docs/explore-analyze/elastic-inference/eis) before generating this code.** Model IDs
> change regularly. Jina v3 is the current default dense model for `semantic_text`; Jina v5-small is available for
> high-throughput / cost-sensitive workloads. ELSER remains available for English-only sparse retrieval but must be
> explicitly specified — it is no longer the automatic default.

#### C2: `dense_vector` Mapping

```json
PUT /my-index
{
  "mappings": {
    "properties": {
      "content": { "type": "text" },
      "content_embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine",
        "index_options": {
          "type": "hnsw",
          "m": 16,
          "ef_construction": 100
        }
      },
      "category": { "type": "keyword" }
    }
  }
}
```

Set `dims` to match your model output (e.g. OpenAI `text-embedding-3-small` = 1536, E5-small = 384, Cohere embed-v3 =
1024).

### Decision D: Embedding Generation (C2/C3 only)

| Option                                       | When to Use                                                           |
| -------------------------------------------- | --------------------------------------------------------------------- |
| **D1: Inference Endpoint + Ingest Pipeline** | Supported model, want server-side embedding                           |
| **D2: Application-Side Embedding**           | Unsupported models, existing embedding pipeline, or need full control |

#### D1: Ingest Pipeline

```json
PUT _ingest/pipeline/embedding-pipeline
{
  "processors": [
    {
      "inference": {
        "model_id": "my-inference-endpoint",
        "input_output": [
          { "input_field": "content", "output_field": "content_embedding" }
        ]
      }
    }
  ]
}
```

#### D2: Application-Side (Python)

```python
import openai
from elasticsearch import Elasticsearch, helpers

es = Elasticsearch("https://your-cluster:443", api_key="your-api-key")

def embed(text):
    return openai.embeddings.create(
        model="text-embedding-3-small", input=text
    ).data[0].embedding

def generate_actions(docs):
    for doc in docs:
        yield {
            "_index": "my-index",
            "_source": {
                "content": doc["text"],
                "content_embedding": embed(doc["text"]),
                "category": doc.get("category")
            }
        }

helpers.bulk(es, generate_actions(your_docs))
```

### Configure Chunking (C1 and D1 paths)

For `semantic_text` (C1), configure on the field:

```json
"content": {
  "type": "semantic_text",
  "inference_id": "my-inference-endpoint",
  "chunking_settings": {
    "strategy": "sentence",
    "max_chunk_size": 250,
    "overlap": 1
  }
}
```

Strategies: `sentence` (default), `word`, `recursive`. Default: sentence, 250 words, 1 overlap.

For D1, chunk in application code or via a script processor before the inference processor.

### Decision E: Ingestion Method

| Option                              | When to Use                                         |
| ----------------------------------- | --------------------------------------------------- |
| **E1: Bulk API / Client Libraries** | Most cases — programmatic ingestion from any source |
| **E2: File Upload (Kibana UI)**     | Testing and small datasets only                     |

Use `helpers.bulk` (Python) or equivalent bulk API in the developer's language. Set `request_timeout=300` on first
ingest to allow time for ML model loading. Use `refresh="wait_for"` when indexing test data.

---

## Phase 3 — Search Implementation

### Decision F: Search Type

| Option           | When to Use                                                        |
| ---------------- | ------------------------------------------------------------------ |
| **F1: Pure kNN** | All queries semantic/meaning-based, no exact term matching needed  |
| **F2: Hybrid**   | **Default** — users search with both keywords and natural language |
| **F3: Semantic** | Using C1 path (`semantic_text`); simplest semantic search          |

#### F3: Semantic Search (C1 path)

```json
POST my-index/_search
{
  "retriever": {
    "standard": {
      "query": {
        "semantic": {
          "field": "content",
          "query": "how do I configure index mappings"
        }
      }
    }
  }
}
```

#### F1: Pure kNN (C2 path)

```json
POST my-index/_search
{
  "retriever": {
    "knn": {
      "field": "content_embedding",
      "query_vector": [0.1, 0.2, ...],
      "k": 10,
      "num_candidates": 100
    }
  }
}
```

Tune `num_candidates` (higher = better recall, slower). For exact kNN on small datasets, use `script_score`.

#### F2: Hybrid Search with RRF

```json
POST my-index/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "multi_match": {
                "query": "elasticsearch index mapping",
                "fields": ["title^2", "content"]
              }
            }
          }
        },
        {
          "knn": {
            "field": "content_embedding",
            "query_vector": [0.1, 0.2, ...],
            "k": 50,
            "num_candidates": 100
          }
        }
      ],
      "window_size": 100,
      "rank_constant": 60
    }
  }
}
```

**Tuning RRF:**

- `window_size`: Docs considered from each retriever. Higher = more semantic influence when BM25 is sparse.
- `rank_constant`: Higher = flatter rank contribution. Lower = steeper top-rank preference.

For filtered hybrid search, add `filter` clauses to both the `standard` (via `bool.filter`) and `knn` retrievers.

### Decision G: Reranking

| Option                    | When to Use                                                     |
| ------------------------- | --------------------------------------------------------------- |
| **G1: No Reranking**      | **Default** — start here, add G2 if relevance isn't good enough |
| **G2: Semantic Reranker** | Relevance quality > latency; adds ~50-200ms                     |
| **G3: Learning to Rank**  | Advanced — requires labeled query/document pairs                |
| **G4: Query Rules**       | Merchandising, editorial control, compliance filtering          |

#### G2: Semantic Reranker

```json
POST my-index/_search
{
  "retriever": {
    "text_similarity_reranker": {
      "retriever": {
        "rrf": {
          "retrievers": [
            { "standard": { "query": { "multi_match": { "query": "your query", "fields": ["content"] } } } },
            { "knn": { "field": "content_embedding", "query_vector": [...], "k": 50, "num_candidates": 100 } }
          ]
        }
      },
      "field": "content",
      "inference_id": "my-reranker-endpoint",
      "inference_text": "your query",
      "rank_window_size": 50
    }
  }
}
```

> EIS provides managed rerankers (currently Jina Reranker v2 and v3). Check
> [reranker docs](https://www.elastic.co/docs/solutions/search/ranking/semantic-reranking) for current model IDs and
> inference endpoint setup.

#### G4: Query Rules

```json
PUT _query_rules/my-ruleset
{
  "rules": [
    {
      "rule_id": "pin-featured",
      "type": "pinned",
      "criteria": [{ "type": "contains", "metadata": "query_string", "values": ["featured"] }],
      "actions": { "ids": ["doc-123"] }
    }
  ]
}
```

### Decision H: Query Method

Always use **Retrievers API** for vector and hybrid search (all examples above use it). Use Query DSL for pure keyword
search. ES|QL is for analytics and data exploration only, not vector retrieval.

### Decision I: App Integration

**AI pipeline:** Use the direct API via a client library, or use Elastic Agent Builder / Playground for LLM integration.

**Human-facing:** Use the direct API, Search Templates for parameterized server-side queries, or Search UI — see the
search-ui skill.

#### LangChain Integration

```bash
pip install langchain-elasticsearch langchain-openai
```

```python
from langchain_elasticsearch import ElasticsearchStore
from langchain_openai import OpenAIEmbeddings
from elasticsearch import Elasticsearch

es_client = Elasticsearch(
    "https://your-cluster.es.us-central1.gcp.elastic.cloud:443",
    api_key="your-api-key"
)

vector_store = ElasticsearchStore(
    es_connection=es_client,
    index_name="my_docs",
    embedding=OpenAIEmbeddings(model="text-embedding-3-small"),
)

vector_store.add_documents([
    {"page_content": "Elasticsearch is a distributed search engine.", "metadata": {"source": "docs"}},
])

results = vector_store.similarity_search("How do I visualize data?", k=3)
```

Use `vector_store.as_retriever()` in a LangChain chain for RAG.

#### LlamaIndex Integration

`pip install llama-index llama-index-vector-stores-elasticsearch` — use `ElasticsearchVectorStore` with `es_url` and
`es_api_key` params. Wrap in `VectorStoreIndex.from_documents()` and query via `.as_query_engine(similarity_top_k=5)`.

#### Search API Endpoint (Human-facing)

Build a `/search` endpoint using the hybrid RRF pattern from F2, wrapping it in the developer's framework (Flask,
Express, Spring, etc.). Always include pagination — `from`/`size` for up to 10,000 results, `search_after` with PIT for
deeper pagination.

---

## Phase 4 — Production & Optimization

### Step 4.0: Performance Requirements

Skip for Serverless (auto-managed). For ECH / Self-Managed, ask about peak QPS, traffic spikiness, and latency targets.

| Requirement    | Configuration Lever                                                             |
| -------------- | ------------------------------------------------------------------------------- |
| High QPS       | More replicas; more shards for large indices                                    |
| Spiky traffic  | Autoscaling deciders on ECH; pre-warm cache after force-merge                   |
| Strict latency | Lower `num_candidates`; quantization; fewer shards for small-medium indices     |
| Max recall     | Higher `num_candidates`; `hnsw` (no quantization); exact kNN for small datasets |

**Serverless:** Only `num_candidates` is tunable for the recall/latency tradeoff.

### Step 4.1: Performance Tuning

**Quantization** — reduces vector memory footprint:

```json
"content_embedding": {
  "type": "dense_vector",
  "dims": 1536,
  "index": true,
  "similarity": "cosine",
  "index_options": {
    "type": "int8_hnsw"
  }
}
```

| Type        | Memory Reduction | Recall Impact                  |
| ----------- | ---------------- | ------------------------------ |
| `hnsw`      | Baseline         | Baseline                       |
| `int8_hnsw` | ~4x              | Minimal                        |
| `int4_hnsw` | ~8x              | Small                          |
| `bbq_hnsw`  | ~32x             | Moderate — test with your data |

Use `bbq_hnsw` when memory is the constraint and you can tolerate slightly lower recall. Use `int8_hnsw` as the safe
default.

**Post-ingestion:** Force-merge segments (`max_num_segments=1`), then clear cache and run warm-up queries.

### Step 4.2: Shard Sizing

- Target **10–50 GB per shard**, max **200M docs per shard**
- Use ILM for rollover on time-series data:

```json
PUT _ilm/policy/vector-rollover
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_size": "50gb", "max_docs": 200000000 }
        }
      }
    }
  }
}
```

### Decision J: Scaling Strategy

Resolved from Decision A: Serverless → automatic; ECH → policy-based autoscaling + adaptive allocations; Self-Managed →
manual provisioning (K8s HPA for ECK).

### Decision K: Monitoring

Resolved from Decision A: Cloud → AutoOps (auto-enabled, recommendations and alerts); Self-Managed → Stack Monitoring
(Metricbeat/Filebeat/Kibana) or external (Prometheus, Grafana, Datadog).

---

## Phase 5 — Iteration & Continuous Improvement

### Step 5.1: Evaluate Search Quality

**Ranking Evaluation API:**

```json
POST my-index/_rank_eval
{
  "requests": [
    {
      "id": "query_1",
      "request": {
        "query": { "multi_match": { "query": "elasticsearch mapping", "fields": ["content"] } }
      },
      "ratings": [
        { "_index": "my-index", "_id": "doc-1", "rating": 3 },
        { "_index": "my-index", "_id": "doc-2", "rating": 1 }
      ]
    }
  ],
  "metric": { "ndcg": { "k": 10 } }
}
```

Use `"profile": true` in search requests to diagnose latency.

### Step 5.2: Refine Pipeline

Work through these levers in order:

| Lever                               | What It Fixes                                           |
| ----------------------------------- | ------------------------------------------------------- |
| Swap embedding model                | Poor semantic recall — wrong language, domain mismatch  |
| Adjust chunking strategy/size       | Chunks too large (noisy) or too small (missing context) |
| Tune `window_size`, `rank_constant` | BM25 or semantic dominating when it shouldn't           |
| Add reranking (G2)                  | Top results semantically close but not the best answer  |
| Add query rules (G4)                | Specific queries need editorial override                |
| Try quantization level              | Memory pressure or latency too high                     |

### Step 5.3: Extend to RAG

If retrieval quality is acceptable and the developer wants generated answers, add an LLM layer. The pattern: retrieve
top-k chunks using the hybrid RRF query from F2, concatenate chunk text into a context string, pass to an LLM with a
grounding system prompt ("Answer based only on the provided context"), and return the answer with source references.

For Elastic-native RAG without external LLM keys, see [Agent Builder](https://www.elastic.co/docs/solutions/search) and
Playground. For full RAG implementation details, use the **rag-chatbot** skill.

---

## Metadata Filtering Patterns

Store `tenant_id`, `user_ids`, `groups` as `keyword` fields. Filter at query time with `bool.filter` using `term` /
`terms` clauses inside both the `standard` and `knn` retrievers. For large-scale multi-tenancy, use separate indices per
tenant instead of row-level filtering.

---

## Common Follow-ups

| Question                                       | Answer                                                         |
| ---------------------------------------------- | -------------------------------------------------------------- |
| "Results aren't relevant enough"               | Run `_rank_eval`, then work through Step 5.2 levers            |
| "Results are too semantic / too keyword-heavy" | Tune `window_size` — higher favors semantic, lower favors BM25 |
| "Memory is too high"                           | Add quantization to `dense_vector` mapping, reindex            |

## When to Use Other Skills

| Situation                                     | Skill             |
| --------------------------------------------- | ----------------- |
| Pure keyword search, no vectors needed        | keyword-search    |
| RAG / Q&A chatbot with LLM answer generation  | rag-chatbot       |
| React search frontend                         | search-ui         |
| Product catalog with facets and merchandising | catalog-ecommerce |
