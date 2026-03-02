# @kbn/ai-infra-common

Shared common utilities and configuration for AI infrastructure packages in Kibana.

## Overview

This package provides shared index settings configuration and utilities for creating Elasticsearch indices optimized for AI/ML workloads, particularly those using semantic text fields.

## Index Settings Configuration

The package exports default index settings and utilities for configuring AI artifact indices:

### Default Inference Endpoints

```typescript
import { DEFAULT_ELSER, DEFAULT_E5_SMALL } from '@kbn/ai-infra-common';

// DEFAULT_ELSER = '.elser-2-elasticsearch'
// DEFAULT_E5_SMALL = '.multilingual-e5-small-elasticsearch'
```

### Semantic Text Mappings

Get pre-configured semantic text mappings for supported inference endpoints:

```typescript
import { getSemanticTextMapping, DEFAULT_ELSER } from '@kbn/ai-infra-common';

const mapping = getSemanticTextMapping(DEFAULT_ELSER);
// Returns: { type: 'semantic_text', inference_id: '.elser-2-elasticsearch' }
```

### Index Settings

Get optimized index settings for AI artifact indices:

```typescript
import { getAiArtifactIndexSettings, DEFAULT_AI_ARTIFACT_INDEX_SETTINGS } from '@kbn/ai-infra-common';

// Use default settings
const settings = DEFAULT_AI_ARTIFACT_INDEX_SETTINGS;

// Or merge with custom settings
const customSettings = getAiArtifactIndexSettings({
  number_of_shards: 2,
  number_of_replicas: 1,
});
```

## Types

The package exports the following types:

- `SemanticTextMapping` - Configuration for semantic text field mappings
- `SemanticTextModelSettings` - Model-specific settings for semantic text
- `AiArtifactIndexConfig` - Configuration options for creating AI artifact indices
- `SupportedInferenceId` - Union type of supported inference endpoint IDs

## Usage in Artifact Builders

This package is designed to be used by artifact builder packages like:
- `@kbn/product-doc-artifact-builder`
- `@kbn/security-labs-artifact-builder`

Example usage:

```typescript
import { Client } from '@elastic/elasticsearch';
import {
  getAiArtifactIndexSettings,
  getSemanticTextMapping,
  DEFAULT_ELSER,
} from '@kbn/ai-infra-common';

async function createArtifactIndex(client: Client, indexName: string) {
  await client.indices.create({
    index: indexName,
    settings: getAiArtifactIndexSettings(),
    mappings: {
      properties: {
        content: getSemanticTextMapping(DEFAULT_ELSER),
      },
    },
  });
}
```
