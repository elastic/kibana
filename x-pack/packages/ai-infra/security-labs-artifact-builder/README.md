# @kbn/security-labs-artifact-builder

Script to build the Security Labs knowledge base artifacts for the AI Assistant.

## Overview

This package generates pre-embedded Security Labs content artifacts that can be distributed via the Kibana Knowledge Base CDN. The artifacts contain `semantic_text` embeddings (ELSER by default, or Jina v5 / E5 via `--inferenceId`) for semantic search capabilities.

## Quick Start (Local Development)

For local development with ELSER deployed on localhost, the command is simple:

```bash
# Build from local security-labs repo checkout
node scripts/build_security_labs_artifact.js --localContentPath ~/dev/security-labs-elastic-co/_content/articles
```

This uses sensible defaults:
- **Version**: Current UTC timestamp in `YYYY.MM.DD-HHMMSS` format (unique per build)
- **Inference**: ELSER (`.elser-2-elasticsearch`)
- **Elasticsearch**: `http://localhost:9200` with `elastic/changeme` credentials
- **Output**: `{REPO_ROOT}/build/kb-artifacts/` — for ELSER timestamped builds this writes both
  `security-labs-{YYYY.MM.DD-HHMMSS}.zip` and a legacy `security-labs-{YYYY.MM.DD}.zip` alias
  (same bytes) for Kibana **9.3 / 9.4** BWC (date-only parsers from
  [#246099](https://github.com/elastic/kibana/pull/246099))

Security Labs articles are published from [Contentstack](https://www.contentstack.com/) (the `elastic/security-labs-elastic-co` repository was archived in October 2026). To build from the published content instead of a local checkout, omit `--localContentPath` and provide the stack API key and a read-only delivery token:

```bash
SECURITY_LABS_CONTENTSTACK_API_KEY=blt_xxx \
SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN=cs_xxx \
  node scripts/build_security_labs_artifact.js --contentstackContentTypes blog,report
```

The fetch pages through the [Content Delivery API](https://www.contentstack.com/docs/developers/apis/content-delivery-api) for each content type, reading the published `--contentstackEnvironment` entries in `--contentstackLocale`. Entry bodies may be Markdown, HTML, or JSON Rich Text; all are converted to plain text before embedding.

To build a Jina v5 variant (requires an EIS-backed `.jina-embeddings-v5-text-small` endpoint on the embedding cluster):

```bash
node scripts/build_security_labs_artifact.js \
  --localContentPath ~/dev/security-labs-elastic-co/_content/articles \
  --inferenceId .jina-embeddings-v5-text-small
```

## Full Command Reference

```bash
node scripts/build_security_labs_artifact.js \
  --artifactVersion 2026.07.10-152831 \
  --localContentPath /path/to/security-labs-content \
  --embeddingClusterUrl http://localhost:9200 \
  --embeddingClusterUsername elastic \
  --embeddingClusterPassword changeme
```

View all options with `--help`:

```bash
node scripts/build_security_labs_artifact.js --help
```

## Parameters

### `--artifactVersion, -v`

Artifact version in `YYYY.MM.DD-HHMMSS` UTC format. Each publish should use a unique timestamp so already-installed clusters can detect same-day updates (legacy `YYYY.MM.DD` remains parseable for older CDN artifacts).

**Default**: Current UTC timestamp (e.g., `2026.07.10-152831`)

### `--inferenceId`

The inference endpoint used to generate the `semantic_text` embeddings. Recognized values: `.elser-2-elasticsearch` (default), `.multilingual-e5-small-elasticsearch`, `.jina-embeddings-v5-text-small`. Any other value is passed through as-is. Non-ELSER ids are appended to the artifact name as `security-labs-{version}--{inferenceId}.zip`.

**Default**: `.elser-2-elasticsearch`

### `--contentstackContentTypes`

Comma-separated Contentstack content type UIDs whose published entries are indexed. Required when `--localContentPath` is not set.

**Default**: none

### `--contentstackDeliveryToken`

Read-only Contentstack delivery token for the `--contentstackEnvironment` environment. Required when `--localContentPath` is not set. Prefer `SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN` so the token stays out of argv and logs.

**Default**: `process.env.SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN`

### `--contentstackApiKey`

API key of the Contentstack stack that hosts Security Labs. Required when `--localContentPath` is not set. Treated like a credential: prefer `SECURITY_LABS_CONTENTSTACK_API_KEY` so it stays out of argv and logs.

**Default**: `process.env.SECURITY_LABS_CONTENTSTACK_API_KEY`

### `--contentstackEnvironment`

Contentstack publishing environment to read published entries from.

**Default**: `production`

### `--contentstackLocale`

Contentstack locale to read entries in.

**Default**: `en-us`

### `--contentstackHost`

Contentstack Content Delivery API host for the stack's region (e.g. `eu-cdn.contentstack.com`). Must be a `*cdn.contentstack.io` / `*cdn.contentstack.com` host; anything else is rejected so the stack credentials are never sent elsewhere and CI rebuilds cannot publish a different source as Security Labs KB.

**Default**: `cdn.contentstack.io`

### `--localContentPath`

Path to a local directory containing Security Labs markdown files (`.md` or `.mdx`). When set, the Contentstack fetch is skipped.

The markdown files should have YAML frontmatter with the following structure:

```markdown
---
title: Article Title
slug: article-slug
date: 2024-12-11
description: Brief description of the article
author:
  - slug: author-slug
category:
  - slug: category-slug
---

Article content here...
```

### `--targetFolder`

The folder to generate the artifact in.

**Default**: `{REPO_ROOT}/build/kb-artifacts`

### `--buildFolder`

The folder to use for temporary files.

**Default**: `{REPO_ROOT}/build/temp-kb-artifacts`

### `--embeddingClusterUrl`

Elasticsearch cluster URL for generating embeddings.

**Default**: `http://localhost:9200`

### `--embeddingClusterUsername`

Username for the embedding cluster.

**Default**: `elastic`

### `--embeddingClusterPassword`

Password for the embedding cluster.

**Default**: `changeme`

## Environment Variables

All CLI parameters can also be set via environment variables:

| Variable | Description |
|----------|-------------|
| `KIBANA_EMBEDDING_CLUSTER_URL` | Elasticsearch cluster URL |
| `KIBANA_EMBEDDING_CLUSTER_USERNAME` | Embedding cluster username |
| `KIBANA_EMBEDDING_CLUSTER_PASSWORD` | Embedding cluster password |
| `SECURITY_LABS_VERSION` | Artifact version (`YYYY.MM.DD-HHMMSS` UTC) |
| `SECURITY_LABS_CONTENT_PATH` | Path to local content |
| `SECURITY_LABS_CONTENTSTACK_CONTENT_TYPES` | Comma-separated Contentstack content type UIDs to index |
| `SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN` | Read-only Contentstack delivery token |
| `SECURITY_LABS_CONTENTSTACK_API_KEY` | Contentstack stack API key |
| `SECURITY_LABS_CONTENTSTACK_ENVIRONMENT` | Contentstack publishing environment (default `production`) |
| `SECURITY_LABS_CONTENTSTACK_LOCALE` | Contentstack locale (default `en-us`) |
| `SECURITY_LABS_CONTENTSTACK_HOST` | Contentstack Content Delivery API host (default `cdn.contentstack.io`) |
| `SECURITY_LABS_INFERENCE_ID` | Inference endpoint id (default ELSER) |

## Prerequisites

Before running the artifact builder, ensure:

1. **ELSER is deployed**: The `.elser-2-elasticsearch` inference endpoint must be available on your Elasticsearch cluster
2. **Content is available**: Either the Contentstack stack API key and delivery token, or Security Labs markdown checked out locally

To check if ELSER is deployed:

```bash
curl -u elastic:changeme http://localhost:9200/_inference/.elser-2-elasticsearch
```

## Artifact Structure

Each publish typically produces three CDN objects (when both ELSER and Jina are built):

| Object | Purpose |
|--------|---------|
| `security-labs-{YYYY.MM.DD-HHMMSS}.zip` | ELSER artifact (same-day updates) |
| `security-labs-{YYYY.MM.DD}.zip` | ELSER alias (same bytes) for Kibana **9.3 / 9.4** BWC — those releases only parse date-only names from [#246099](https://github.com/elastic/kibana/pull/246099) |
| `security-labs-{YYYY.MM.DD-HHMMSS}--.jina-embeddings-v5-text-small.zip` | Jina variant |

> **Why the alias exists:** Security Labs CDN install shipped in 9.3 ([#246099](https://github.com/elastic/kibana/pull/246099)) with `YYYY.MM.DD` filenames. Timestamp versions (`YYYY.MM.DD-HHMMSS`) are invisible to that parser, so each ELSER publish also writes a date-only twin. New Kibana prefers the timestamped object via lexicographic sort; 9.3/9.4 still get content via the alias. Jina needs no alias (9.3/9.4 never looked for `--jina...` names). The alias can be dropped once 9.3/9.4 are out of support.

The generated zip contains:

```
security-labs-2026.07.10-152831.zip
├── manifest.json          # Artifact metadata (version, format, resourceType)
├── mappings.json          # Elasticsearch index mappings with semantic_text fields
└── content/
    ├── content-1.ndjson   # Embedded documents with ELSER vectors
    ├── content-2.ndjson
    └── ...
```

### Document Schema

Each document in the NDJSON files contains:

| Field | Type | Description |
|-------|------|-------------|
| `title` | text | Article title |
| `slug` | keyword | URL-friendly identifier |
| `date` | date | Publication date |
| `description` | semantic_text | Article description (with ELSER embeddings) |
| `authors` | text | Comma-separated author slugs |
| `categories` | keyword[] | Category slugs |
| `content` | semantic_text | Full article content (with ELSER embeddings) |
| `resource_type` | keyword | Always `security_labs` |

## CI / Automation

In CI the artifact is built for both ELSER (local ES) and Jina v5 (EIS) inside the EIS-enabled FTR at `x-pack/platform/test/functional_gen_ai/inference/artifacts/security_labs.ts`, which writes both zips to `build/kb-artifacts` for upload to the dev KB bucket.

The dedicated Buildkite pipeline (`.buildkite/pipelines/gen_ai_security_labs.yml`) has `trigger_mode: none` in its resource definition — it does not auto-run on Kibana branch/PR events. Instead, a Contentstack webhook on the Security Labs content types posts to the pipeline on every publish/unpublish, and each build re-embeds the full published corpus. A newer build cancels an older in-flight one (`cancel_intermediate_builds`), so bursts of publishes produce a single artifact. Manual rebuilds can be started from the Buildkite UI.

- The stack API key and read-only delivery token are loaded from Vault (`secret/ci/elastic-kibana/security-labs-contentstack`, fields `api_key` and `delivery_token`) as `SECURITY_LABS_CONTENTSTACK_API_KEY` and `SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN` in `setup_job_env.sh`.
- `SECURITY_LABS_VERSION` may be set to a UTC timestamp `YYYY.MM.DD-HHMMSS`; when unset, each build uses its start time, so same-day publishes produce distinct artifact versions and already-installed clusters pick up updates.

### Publishing to production

CI only uploads to the **dev** bucket (`gs://kibana-ai-assistant-kb-artifacts-dev`). Promoting an artifact to the production bucket behind `https://kibana-knowledge-base-artifacts.elastic.co` is intentionally a manual, human-in-the-loop step: verify the new zips (install, search quality, and BWC with 9.3 / 9.4 via the date-only alias) against a dev Kibana pointed at the dev bucket before copying them to production.

## Future Enhancements

- Air-gapped Jina support once EIS disconnected mode ships (Jina currently requires EIS/Cloud Connected Mode).

