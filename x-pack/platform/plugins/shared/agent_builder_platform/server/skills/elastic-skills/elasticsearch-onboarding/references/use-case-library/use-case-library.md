---
name: use-case-library
description:
  Elasticsearch use case library — the full map of what you can build, with industry examples and technologies. Use when
  a developer asks "what can Elastic do?", "what can I build?", "what use cases does Elasticsearch support?", "show me
  examples", or needs help choosing what to build.
---

# Elasticsearch Use Case Library

Present this library when a developer asks what they can build with Elasticsearch, wants to explore use cases, or needs
help figuring out which category their project falls into. Walk through the relevant use cases conversationally — don't
dump the entire list. Ask what resonates, then route to the appropriate implementation guide.

## How to Use This Library

1. **If the developer is exploring** — summarize the 8 use cases with one-line descriptions and ask which sounds closest
   to what they're building.
2. **If the developer describes something specific** — match it to a use case below and confirm: "That sounds like [use
   case] — here's what that typically involves. Sound right?"
3. **Once a use case is confirmed** — return to the playbook and continue the conversation.

## The Use Cases

### 1. Product & Catalog Search

Help users find and filter items from a structured catalog.

**Industries:** E-commerce, marketplace, retail, real estate, automotive, job boards

**Examples:**

- Online store product search with filters and facets
- Marketplace listing search (Airbnb, Etsy-style)
- Auto parts lookup by make, model, year
- Job search with location, salary, and role filters
- Real estate property search with price and amenity filters

**What Elasticsearch does:**

- Full-text search (BM25) for keyword matching on titles and descriptions
- Faceted filtering for price ranges, categories, brands, ratings
- Fuzzy matching for typo tolerance ("runnign shoes" still works)
- Synonyms API for domain-specific equivalents (sneakers = trainers)
- Completion suggester for search-as-you-type autocomplete
- Semantic reranking (optional) to boost results that match intent, not just words

---

### 2. Knowledge Base & Document Search

Let people search long-form content and find relevant passages.

**Industries:** SaaS, publishing, education, government, legal, healthcare

**Examples:**

- Internal wiki or documentation search (Confluence, Notion-style)
- Legal case law research across thousands of rulings
- Medical literature and clinical guideline search
- University course catalog and academic paper search
- Government policy and regulation search

**What Elasticsearch does:**

- Hybrid search (BM25 + kNN via RRF) for best of exact match + meaning
- Semantic search (dense vectors) to find relevant content even when words don't match
- Highlighting to show matching snippets in context
- Nested objects for searching within structured document sections
- Jina v3 (default EIS embedding model, multilingual) or ELSER (English-only sparse) for NLP-powered retrieval

---

### 3. AI-Powered Assistant / Chatbot

Build a conversational agent that answers questions using your data.

**Industries:** Customer support, SaaS, healthcare, financial services, education

**Examples:**

- "ChatGPT over your docs" — answer questions from company knowledge
- Internal IT helpdesk bot that resolves common issues
- Patient FAQ bot for healthcare providers
- Financial advisor assistant that references product documentation
- Student Q&A bot trained on course materials

**What Elasticsearch does:**

- RAG pipeline — retrieve relevant chunks, feed to LLM for answer generation
- Vector search (kNN) for semantically similar content retrieval
- Embedding models (Jina v3 via EIS by default, or OpenAI, Cohere, ELSER) to convert text to vectors
- LangChain / LlamaIndex integration for orchestrating retrieval + generation
- Chunking strategy guidance — how to split documents for effective retrieval

---

### 4. Recommendations & Discovery

Suggest relevant content users didn't explicitly search for — "you might also like".

**Industries:** Media, streaming, e-commerce, news, social platforms, music

**Examples:**

- "You might also like" product suggestions
- Related articles or blog posts
- Content personalization based on reading history
- "Customers also bought" cross-sell recommendations
- Music or video playlist suggestions based on similarity

**What Elasticsearch does:**

- Vector similarity (kNN) to find items "close" in embedding space
- More Like This queries to find similar documents based on content
- Semantic embeddings to represent items as vectors for comparison
- Filtering + boosting to constrain by category, recency, availability
- Script scoring to blend similarity with business rules (margin, inventory)

---

### 5. Customer Support Search

Help agents find solutions faster and customers help themselves.

**Industries:** SaaS, telecom, financial services, insurance, utilities

**Examples:**

- Agent assist — find similar resolved tickets to suggest resolutions
- Self-service portal — customers search for answers before filing a ticket
- Knowledge deflection — suggest articles when a user starts typing a ticket
- Escalation routing — classify and route tickets based on content
- Trend detection — surface emerging issues across support volume

**What Elasticsearch does:**

- Hybrid search for exact match on error codes + semantic match on symptom descriptions
- Semantic similarity to find tickets with similar problems regardless of wording
- Synonyms API for domain terminology ("can't log in" = "authentication failure" = "password issue")
- Highlighting to surface relevant resolution steps for agents
- Aggregations to detect support trends and cluster related issues

---

### 6. Location-Based Search

Find things near a place — stores, restaurants, properties, services.

**Industries:** Retail, food delivery, real estate, travel, logistics, healthcare

**Examples:**

- Store locator — find nearest retail locations
- "Restaurants near me" with cuisine filters
- Property search within a neighborhood or school district
- Nearest hospital or pharmacy finder
- Delivery radius calculation for logistics

**What Elasticsearch does:**

- Geo-point / geo-shape fields to store coordinates and boundaries
- Distance sorting to rank results by proximity to user
- Bounding box / polygon filters to search within a specific area
- Combined with full-text — "pizza near me" = geo filter + keyword search
- Geo-aggregations to cluster results on a map

---

### 7. Log & Event Search

Search, explore, and analyze machine-generated data.

**Industries:** DevOps, security operations, IoT, financial services, telecom

**Examples:**

- Application log search and troubleshooting
- Security event investigation (SIEM)
- IoT sensor data exploration
- Audit trail and compliance search
- Transaction monitoring and anomaly detection

**What Elasticsearch does:**

- Data streams for append-only, time-partitioned storage
- Index Lifecycle Management (ILM) for hot/warm/cold/frozen data tiers
- ES|QL for piped analytics queries
- Aggregations for histograms, percentiles, cardinality, and trends
- Runtime fields to extract structure from unstructured logs at query time

**Note:** Log and event search is typically handled by Elastic's **Observability** or **Security** solutions, which
provide purpose-built UIs (Discover, Dashboards, SIEM). If the developer describes this use case, redirect them: on
Hosted, they can change the solution view in Kibana; on Serverless, they should create an Observability or Security
project.

---

### 8. Vector Store (for AI/ML Pipelines)

Store and retrieve embeddings programmatically — code searches, not people.

**Industries:** AI/ML companies, any organization building with LLMs, research labs

**Examples:**

- Embedding storage and retrieval for RAG pipelines
- Image similarity search (reverse image lookup)
- Code search across repositories by semantic meaning
- Duplicate detection across large document sets
- Anomaly detection using vector distance from normal patterns

**What Elasticsearch does:**

- Dense vector fields to store high-dimensional embeddings
- kNN / ANN (HNSW) for approximate nearest neighbor search at scale
- Scalar and product quantization to compress vectors for cost/performance
- LangChain / LlamaIndex vector store as a drop-in integration
- Metadata filtering to combine vector similarity with structured filters

---

## Quick Reference: Use Case to Technology Map

| Use Case                 | Primary Tech                              | Optional Additions                         |
| ------------------------ | ----------------------------------------- | ------------------------------------------ |
| Product & catalog search | Full-text (BM25), facets, fuzzy, synonyms | Semantic reranking, autocomplete           |
| Knowledge base search    | Hybrid (BM25 + kNN via RRF)               | Highlighting, nested objects               |
| AI assistant / chatbot   | Vector search (kNN), RAG pipeline         | LangChain/LlamaIndex, Jina Reranker, ELSER |
| Recommendations          | Vector similarity (kNN), More Like This   | Script scoring, behavioral signals         |
| Customer support search  | Hybrid search, synonyms                   | Aggregations for trend detection           |
| Location-based search    | Geo-point, distance sort, geo filters     | Combined with full-text                    |
| Log & event search       | Data streams, ILM, ES\|QL, aggregations   | Runtime fields                             |
| Vector store             | Dense vectors, kNN/ANN (HNSW)             | Quantization, metadata filtering           |

## Non-Search Use Cases

If the developer describes something that isn't search, acknowledge it and redirect:

- **Monitoring infrastructure or applications** — That's Elastic Observability. On Hosted, change the solution view in
  Kibana. On Serverless, create an Observability project.
  [Docs](https://www.elastic.co/guide/en/observability/current/index.html)
- **Detecting threats or investigating security events** — That's Elastic Security. On Hosted, change the solution view.
  On Serverless, create a Security project. [Docs](https://www.elastic.co/guide/en/security/current/index.html)
- **Building dashboards and visualizations** — Kibana has built-in dashboards, Lens, and Maps. Point them to Kibana's
  visualization tools rather than building from scratch.
