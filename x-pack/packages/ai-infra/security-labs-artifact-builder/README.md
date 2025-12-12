# @kbn/security-labs-artifact-builder

Script to build the Security Labs knowledge base artifacts for the AI Assistant.

## Overview

This package generates pre-embedded Security Labs content artifacts that can be distributed via the Kibana Knowledge Base CDN. The artifacts contain ELSER embeddings for semantic search capabilities.

## Quick Start (Local Development)

For local development with ELSER deployed on localhost, the command is simple:

```bash
# Build from local security-labs repo checkout
node scripts/build_security_labs_artifact.js --localContentPath ~/dev/security-labs-elastic-co/_content/articles
```

This uses sensible defaults:
- **Version**: Today's date in `YYYY.MM.DD` format
- **Elasticsearch**: `http://localhost:9200` with `elastic/changeme` credentials
- **Output**: `{REPO_ROOT}/build/security-labs-artifacts/`

## Full Command Reference

```bash
node scripts/build_security_labs_artifact.js \
  --artifactVersion 2024.12.11 \
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

The date-based version for the artifact in `YYYY.MM.DD` format.

**Default**: Today's date (e.g., `2025.12.11`)

### `--localContentPath`

Path to a local directory containing Security Labs markdown files (`.md` or `.mdx`).

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

**Default**: `{REPO_ROOT}/build/security-labs-artifacts`

### `--buildFolder`

The folder to use for temporary files.

**Default**: `{REPO_ROOT}/build/temp-security-labs-artifacts`

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
| `SECURITY_LABS_VERSION` | Artifact version |
| `SECURITY_LABS_CONTENT_PATH` | Path to local content |
| `SECURITY_LABS_REPO_URL` | GitHub repository URL (future) |
| `GITHUB_TOKEN` | GitHub token (future) |

## Prerequisites

Before running the artifact builder, ensure:

1. **ELSER is deployed**: The `.elser-2-elasticsearch` inference endpoint must be available on your Elasticsearch cluster
2. **Content is available**: Have the security-labs content checked out locally

To check if ELSER is deployed:

```bash
curl -u elastic:changeme http://localhost:9200/_inference/.elser-2-elasticsearch
```

## Artifact Structure

The generated artifact (`security-labs-{version}.zip`) contains:

```
security-labs-2025.12.11.zip
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

## Future Enhancements

- GitHub repository fetching (currently stubbed, use `--localContentPath` instead)
- Support for different embedding models (currently ELSER only)

