---
name: search-ui
description:
  Guide for building search frontends with Elastic's Search UI library. Use when a developer has a working Elasticsearch
  backend and needs a search page — results, facets, autocomplete, pagination. Connects to any recipe that produces a
  search API.
---

# Search UI Frontend Guide

Guide developers through building a search frontend with Elastic's Search UI library (`@elastic/search-ui`). Use this
guide **after** a backend recipe (keyword-search, vector-hybrid-search, catalog-ecommerce) has produced a working index
and API, and the developer asks "now how do I build the search page?"

## 1. When to Use This Guide

Apply this guide when the developer signals:

- **"How do I build the search page?"** — they have an Elasticsearch index/API and need a frontend
- **"I need a search bar with filters"** — they want pre-built UI components, not raw HTML
- **"I want faceted search"** — sidebar filters with counts, like any e-commerce site
- **"I need autocomplete"** — suggestions as the user types
- **"What's the fastest way to get a search UI?"** — they want a library, not to build from scratch

Do **not** use this guide when:

- The developer is building an AI pipeline where code (not humans) consumes search results — point them to
  vector-hybrid-search
- They only need a backend API with no frontend — they're done after the backend recipe
- They want to use a completely different frontend framework (Vue, Angular, Svelte) **without React** — Search UI's
  pre-built components are React-only, though the headless core works with any framework. Explain the tradeoff: with
  React they get pre-built components out of the box; without React they get state management and query orchestration
  but must build their own UI components

## 2. Prerequisites

Before starting this guide, the developer should have:

1. **A working Elasticsearch index** with data (from any backend recipe)
2. **Connection details** — one of:
   - Cloud ID (Elastic Cloud Hosted)
   - Elasticsearch project endpoint URL (Elastic Cloud Serverless)
   - Host URL (self-managed)
3. **An API key** with at least read access to the index
4. **A React project** — Next.js is also supported with a dedicated integration pattern.

## 3. Installation

```shell
npm install @elastic/search-ui @elastic/react-search-ui @elastic/react-search-ui-views @elastic/search-ui-elasticsearch-connector
```

Four packages:

- `@elastic/search-ui` — headless core (state, actions, query orchestration)
- `@elastic/react-search-ui` — React bindings (`SearchProvider`, `useSearch` hook)
- `@elastic/react-search-ui-views` — pre-built React components with default styling
- `@elastic/search-ui-elasticsearch-connector` — connects to Elasticsearch directly

## 4. Connector Setup

The connector is how Search UI talks to Elasticsearch. Setup depends on the deployment model.

### Development: Direct Connection

For local development and prototyping, connect directly. **Never use this in production** — it exposes API credentials
to the browser.

```js
import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

const connector = new ElasticsearchAPIConnector({
  // Elastic Cloud Hosted — use cloud.id:
  cloud: { id: "<your-cloud-id>" },
  // Elastic Cloud Serverless or self-managed — use host instead of cloud:
  // host: "https://<your-elasticsearch-endpoint>",
  index: "<your-index-name>",
  apiKey: "<read-only-api-key>",
});
```

**CORS for direct browser connections:** If connecting directly from the browser (development only), Elasticsearch needs
CORS headers. In Elastic Cloud Hosted, go to deployment settings → Edit user settings and add:

```yaml
http.cors.allow-origin: "*"
http.cors.enabled: true
http.cors.allow-credentials: true
http.cors.allow-methods: OPTIONS, HEAD, GET, POST, PUT, DELETE
http.cors.allow-headers:
  X-Requested-With, X-Auth-Token, Content-Type, Content-Length, Authorization, Access-Control-Allow-Headers, Accept,
  x-elastic-client-meta
```

Serverless projects handle CORS automatically. Self-managed clusters need the same settings in `elasticsearch.yml`.

### Production: Proxy Connector

In production, proxy all requests through your backend. This avoids exposing credentials, lets you add caching, logging,
and access control.

**Frontend (browser):**

```js
import { ApiProxyConnector } from "@elastic/search-ui-elasticsearch-connector/api-proxy";

const connector = new ApiProxyConnector({
  basePath: "/api",
});
```

**Backend (Express server):**

```js
import express from "express";
import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

const app = express();
app.use(express.json());

const connector = new ElasticsearchAPIConnector({
  host: "<your-elasticsearch-endpoint>",
  index: "<your-index-name>",
  apiKey: "<your-api-key>",
});

app.post("/api/search", async (req, res) => {
  const { state, queryConfig } = req.body;
  const response = await connector.onSearch(state, queryConfig);
  res.json(response);
});

app.post("/api/autocomplete", async (req, res) => {
  const { state, queryConfig } = req.body;
  const response = await connector.onAutocomplete(state, queryConfig);
  res.json(response);
});

app.listen(3001);
```

This pattern works identically for Hosted, Serverless, and self-managed — the only difference is how you configure the
server-side connector (`cloud.id` vs `host`).

For Next.js, use API routes instead of a separate Express server — same connector on the server, same
`ApiProxyConnector` on the client.

## 5. Configuration

The configuration object tells Search UI which fields to search, which fields to show, and how to build facets. **This
must match the index mapping created in the backend recipe.**

### Mapping Config to Your Index

The configuration fields map directly to the Elasticsearch index mapping. Here's how to translate:

| Index Mapping                               | Search UI Config                                    |
| ------------------------------------------- | --------------------------------------------------- |
| `text` fields you want searchable           | `search_fields` with optional `weight`              |
| Fields to display in results                | `result_fields` with `raw` or `snippet`             |
| `keyword` fields for filtering              | `facets` with `type: "value"`                       |
| Numeric fields for range filters            | `facets` with `type: "range"` and `ranges` array    |
| `geo_point` fields                          | `facets` with `type: "range"`, `center`, and `unit` |
| `completion` or `search_as_you_type` fields | `autocompleteQuery.suggestions`                     |

### Example: Product Search Config

This matches the index mapping from the catalog-ecommerce recipe:

```js
const config = {
  apiConnector: connector,
  alwaysSearchOnInitialLoad: true,
  searchQuery: {
    search_fields: {
      title: { weight: 3 },
      description: {},
      brand: { weight: 2 },
      tags: {},
    },
    result_fields: {
      title: { snippet: { size: 100, fallback: true } },
      description: { snippet: { size: 200, fallback: true } },
      brand: { raw: {} },
      price: { raw: {} },
      rating: { raw: {} },
      image_url: { raw: {} },
      category: { raw: {} },
    },
    fuzziness: true,
    disjunctiveFacets: ["category", "brand"],
    facets: {
      category: { type: "value", size: 20 },
      brand: { type: "value", size: 20 },
      price: {
        type: "range",
        ranges: [
          { from: 0, to: 25, name: "Under $25" },
          { from: 25, to: 50, name: "$25–$50" },
          { from: 50, to: 100, name: "$50–$100" },
          { from: 100, to: 200, name: "$100–$200" },
          { from: 200, name: "$200+" },
        ],
      },
      rating: {
        type: "range",
        ranges: [
          { from: 4, name: "4+ stars" },
          { from: 3, to: 4, name: "3–4 stars" },
          { from: 0, to: 3, name: "Under 3 stars" },
        ],
      },
    },
  },
  autocompleteQuery: {
    results: {
      resultsPerPage: 5,
      search_fields: {
        "title.autocomplete": { weight: 3 },
      },
      result_fields: {
        title: { snippet: { size: 100, fallback: true } },
        price: { raw: {} },
        image_url: { raw: {} },
      },
    },
    suggestions: {
      types: {
        documents: { fields: ["title_suggest"] },
      },
      size: 4,
    },
  },
};
```

**`disjunctiveFacets`** — list fields here if you want facet counts to stay visible after a selection. Without this,
selecting "Electronics" as a category would hide all other category options. With it, the user can see counts for other
categories and add more selections.

**`fuzziness: true`** — enables typo tolerance. Internally maps to Elasticsearch's `fuzziness: "AUTO"`.

### Autocomplete Field Requirements

Autocomplete has two modes that require different field types in the mapping:

| Mode          | What It Does                         | Required Mapping                                      |
| ------------- | ------------------------------------ | ----------------------------------------------------- |
| `results`     | Shows matching documents as you type | `search_as_you_type` field (best) or any `text` field |
| `suggestions` | Shows suggested query terms          | `completion` field                                    |

If the backend recipe already created `completion` or `search_as_you_type` fields, reference them here. If not, the
developer will need to update the mapping and reindex.

## 6. Components

### Minimal Working Search Page

```jsx
import React from "react";
import {
  SearchProvider,
  SearchBox,
  Results,
  PagingInfo,
  ResultsPerPage,
  Paging,
  Facet,
  Sorting,
  ErrorBoundary,
} from "@elastic/react-search-ui";
import { Layout } from "@elastic/react-search-ui-views";
import "@elastic/react-search-ui-views/lib/styles/styles.css";

export default function SearchPage() {
  return (
    <SearchProvider config={config}>
      <div className="App">
        <ErrorBoundary>
          <Layout
            header={
              <SearchBox
                autocompleteResults={{
                  titleField: "title",
                  urlField: "url",
                  sectionTitle: "Results",
                }}
                autocompleteSuggestions={true}
                debounceLength={300}
              />
            }
            sideContent={
              <div>
                <Facet field="category" label="Category" />
                <Facet field="brand" label="Brand" />
                <Facet field="price" label="Price" />
                <Facet field="rating" label="Rating" />
              </div>
            }
            bodyContent={<Results shouldTrackClickThrough />}
            bodyHeader={
              <>
                <PagingInfo />
                <ResultsPerPage options={[10, 20, 50]} />
                <Sorting
                  label="Sort by"
                  sortOptions={[
                    { name: "Relevance", value: [] },
                    { name: "Price: Low to High", value: [{ field: "price", direction: "asc" }] },
                    { name: "Price: High to Low", value: [{ field: "price", direction: "desc" }] },
                    { name: "Rating", value: [{ field: "rating", direction: "desc" }] },
                  ]}
                />
              </>
            }
            bodyFooter={<Paging />}
          />
        </ErrorBoundary>
      </div>
    </SearchProvider>
  );
}
```

### Available Components

| Component        | Purpose                        | Key Props                                                                             |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `SearchBox`      | Search input with autocomplete | `autocompleteResults`, `autocompleteSuggestions`, `searchAsYouType`, `debounceLength` |
| `Results`        | Render search result list      | `shouldTrackClickThrough`, custom `view`                                              |
| `Result`         | Single result card             | `titleField`, `urlField`, custom `view`                                               |
| `Facet`          | Sidebar filter                 | `field`, `label`, `filterType` ("any", "all", "none")                                 |
| `Sorting`        | Sort dropdown                  | `sortOptions` array                                                                   |
| `Paging`         | Page navigation                | -                                                                                     |
| `PagingInfo`     | "Showing 1-10 of 250 results"  | -                                                                                     |
| `ResultsPerPage` | Results per page selector      | `options` array                                                                       |
| `ErrorBoundary`  | Catches and displays errors    | -                                                                                     |
| `Layout`         | Pre-built page layout          | `header`, `sideContent`, `bodyContent`, `bodyHeader`, `bodyFooter`                    |

### Customizing Result Display

Pass a custom `resultView` function to `<Results>` to render product cards, images, or any layout. The function receives
the full `result` object — access fields via `result.<field>.raw` (exact value) or `result.<field>.snippet` (highlighted
HTML).

## 7. Custom Query Strategies

Search UI's default query works for keyword search. For semantic, hybrid, or advanced queries, use `getQueryFn` to
override the query generation.

### Semantic Search (requires ES 8.15+ with `semantic_text` field)

```js
const connector = new ElasticsearchAPIConnector({
  // ... connection config ...
  getQueryFn: (state, config) => ({
    semantic: {
      field: "content_semantic",
      query: state.searchTerm,
    },
  }),
});
```

### Hybrid Search (keyword + semantic via RRF)

For hybrid search, use `interceptSearchRequest` to inject a retriever-based query:

```js
const connector = new ElasticsearchAPIConnector({
  // ... connection config ...
  interceptSearchRequest: async ({ requestBody, requestState, queryConfig }, next) => {
    if (!requestState.searchTerm) return next(requestBody);

    const modifiedBody = {
      ...requestBody,
      query: undefined,
      retriever: {
        rrf: {
          retrievers: [
            {
              standard: {
                query: {
                  multi_match: {
                    query: requestState.searchTerm,
                    fields: ["title^3", "description"],
                  },
                },
              },
            },
            {
              standard: {
                query: {
                  semantic: {
                    field: "content_semantic",
                    query: requestState.searchTerm,
                  },
                },
              },
            },
          ],
        },
      },
    };

    return next(modifiedBody);
  },
});
```

### Sparse Vector

For most use cases, the Semantic Search example above is the recommended starting point — it uses `semantic_text` with
Jina v3 (the default EIS dense embedding model, multilingual). Use the `sparse_vector` query below when you specifically
need sparse-vector retrieval. ELSER (`.elser-2-elasticsearch`) is available as an English-only sparse alternative, but
must be explicitly specified via `inference_id`.

```js
const connector = new ElasticsearchAPIConnector({
  // ... connection config ...
  getQueryFn: (state, config) => ({
    sparse_vector: {
      field: "content_embedding",
      inference_id: ".jina-embeddings-v3",
      query: state.searchTerm,
    },
  }),
});
```

### Version Considerations for Query Strategies

| Strategy                    | Minimum ES Version | Notes                                                                                  |
| --------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| Keyword (multi_match, bool) | Any modern version | Works everywhere                                                                       |
| Semantic (`semantic` query) | 8.15+              | Requires `semantic_text` field; default EIS model is Jina v3 (multilingual dense)      |
| kNN                         | 8.0+               | Use `dense_vector` field                                                               |
| Sparse vector / ELSER       | 8.11+              | English-only sparse vectors; must be explicitly configured (Jina v3 is default on EIS) |
| Hybrid with RRF retrievers  | 8.14+              | Retriever syntax                                                                       |
| Serverless                  | Always latest      | All features available                                                                 |

**When generating code, check the developer's Elasticsearch version (confirmed in the main playbook's Step 3) and only
recommend query strategies their version supports.**

## 8. Known Limitations

- **Nested objects don't render** — Search UI's Elasticsearch connector cannot display nested object fields. Use
  flattened or keyword fields for facets instead of nested.
- **React-only components** — The pre-built components (`@elastic/react-search-ui-views`) are React-only. The headless
  core works with any framework, but you must build your own UI components.
- **Query DSL only** — Search UI generates Query DSL, not ES|QL. ES|QL is not supported for search queries through
  Search UI.
- **No built-in auth** — Search UI doesn't handle user authentication. If different users see different data
  (multi-tenancy), implement document-level security via the proxy layer.
- **Facet counts with filters** — Without `disjunctiveFacets`, selecting a facet value hides other options. Always list
  filterable facets in `disjunctiveFacets` for a good UX.

## 9. Common Follow-Ups

| Question                                          | Answer                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| "How do I make facets stay open after selection?" | Add the field name to the `disjunctiveFacets` array.                                                   |
| "How do I deploy this?"                           | Switch to `ApiProxyConnector` on the frontend. Run the proxy server alongside your app.                |
| "Can I use this with Vue/Angular?"                | The headless core works with any framework. Build your own components via `SearchDriver`.              |
| "How do I add semantic search?"                   | Use `getQueryFn` with a `semantic` query (requires ES 8.15+ and `semantic_text` field). See section 7. |

## 10. Connecting to Backend Recipes

This guide is designed to plug into any backend recipe. Here's how the handoff works:

| Backend Pattern          | What It Provides                                               | Search UI Connects Via                                                  |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **keyword-search**       | Text fields, keyword filters, completion field                 | Default query config — map `search_fields` and `facets` to the index    |
| **catalog-ecommerce**    | Product mapping with synonyms, nested attributes, autocomplete | Full config example in section 5 above                                  |
| **vector-hybrid-search** | BM25 + semantic fields, `semantic_text` or `dense_vector`      | `getQueryFn` or `interceptSearchRequest` with RRF retriever (section 7) |

The backend recipe builds the index, mapping, ingestion, and API. This recipe builds the frontend on top. If the
developer followed a backend recipe that produced a Flask/Express API, they have two choices:

1. **Use Search UI's connector** to query Elasticsearch directly (through a proxy) — replaces the backend API for search
2. **Keep the backend API** and build a custom connector that calls it — useful when the API does more than search
   (auth, logging, business logic)

For option 2, implement a custom connector class with `onSearch(requestState, queryConfig)`,
`onAutocomplete(requestState, queryConfig)`, `onResultClick()`, and `onAutocompleteResultClick()`. Each method receives
Search UI state and must return `{ results, totalResults, facets }`.

## References

- [Search UI documentation](https://www.elastic.co/docs/reference/search-ui)
- [Elasticsearch Connector reference](https://www.elastic.co/docs/reference/search-ui/api-connectors-elasticsearch)
- [Production usage guide](https://www.elastic.co/docs/reference/search-ui/tutorials-elasticsearch-production-usage)
- [Next.js integration](https://www.elastic.co/docs/reference/search-ui/guides-nextjs-integration)
- [Component API reference](https://www.elastic.co/docs/reference/search-ui/api-react-components-search-box)
- [CodeSandbox examples](https://codesandbox.io/p/sandbox/github/elastic/search-ui/tree/main/examples/sandbox)
