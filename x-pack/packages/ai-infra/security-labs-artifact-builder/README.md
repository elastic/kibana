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

To fetch content directly from the (internal) `elastic/security-labs-elastic-co` repository instead of a local checkout, omit `--localContentPath` and provide a token:

```bash
GITHUB_TOKEN=ghp_xxx node scripts/build_security_labs_artifact.js
```

The fetch uses a sparse, blobless partial `git` checkout that downloads only `--contentSubPath` (`_content/articles` by default) for the requested ref — the rest of the (large) website repository is never transferred.

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

### `--githubRepoUrl`

GitHub repository to fetch content from when `--localContentPath` is not provided. Must resolve to `elastic/security-labs-elastic-co` (other repos are rejected so CI rebuilds cannot publish a different source as Security Labs KB). Use `--localContentPath` for local or fork checkouts.

**Default**: `https://github.com/elastic/security-labs-elastic-co`

### `--githubRef`

Git ref (branch, tag, or commit) to fetch content from.

**Default**: `main`

### `--contentSubPath`

Repository-relative path that holds the article markdown.

**Default**: `_content/articles`

### `--githubToken`

GitHub token used to authenticate the content fetch. Required when fetching from the internal repo (i.e. when `--localContentPath` is not set).

**Default**: `process.env.GITHUB_TOKEN`

### `--localContentPath`

Path to a local directory containing Security Labs markdown files (`.md` or `.mdx`). When set, GitHub fetching is skipped.

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
| `SECURITY_LABS_REPO_URL` | GitHub repository URL (must be `elastic/security-labs-elastic-co`) |
| `SECURITY_LABS_REPO_REF` | Git ref to fetch. Prefer a commit SHA from the article-publish trigger; defaults to `main` |
| `SECURITY_LABS_CONTENT_SUBPATH` | Repo-relative content path (default `_content/articles`) |
| `SECURITY_LABS_INFERENCE_ID` | Inference endpoint id (default ELSER) |
| `GITHUB_TOKEN` | GitHub token for fetching the internal repo |

## Prerequisites

Before running the artifact builder, ensure:

1. **ELSER is deployed**: The `.elser-2-elasticsearch` inference endpoint must be available on your Elasticsearch cluster
2. **Content is available**: Have the security-labs content checked out locally

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

The dedicated Buildkite pipeline (`.buildkite/pipelines/gen_ai_security_labs.yml`) has `trigger_mode: none` in its resource definition — it does not auto-run on Kibana branch/PR events. Article-publish automation in `elastic/security-labs-elastic-co` (or a manual rebuild) should trigger it via the Buildkite API and pass:

- `SECURITY_LABS_REPO_REF` — published commit SHA (pins which content is fetched)
- `SECURITY_LABS_VERSION` — UTC timestamp `YYYY.MM.DD-HHMMSS` unique to that publish (so same-day articles produce distinct artifact versions and already-installed clusters can pick up updates)

## Future Enhancements

- Air-gapped Jina support once EIS disconnected mode ships (Jina currently requires EIS/Cloud Connected Mode).

