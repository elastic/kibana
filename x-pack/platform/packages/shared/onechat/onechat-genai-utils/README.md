# @kbn/onechat-genai-utils

Generative AI utilities for OneChat integration in Kibana. This package provides tools for natural language search, index exploration, ESQL generation, and document retrieval to support AI-powered chat functionality.

## Overview

The `@kbn/onechat-genai-utils` package contains comprehensive utilities for integrating generative AI capabilities with Elasticsearch and Kibana, enabling natural language interactions with data through chat interfaces.

## Package Details

- **Package Type**: `shared-common`  
- **Purpose**: AI-powered data interaction utilities
- **Dependencies**: Elasticsearch client, ESQL processing libraries

## Core Functions

### Search and Query Tools
- `naturalLanguageSearch()` - Convert natural language to Elasticsearch queries
- `relevanceSearch()` - Perform relevance-based search operations  
- `generateEsql()` - Generate ESQL queries from natural language
- `executeEsql()` - Execute ESQL queries against Elasticsearch

### Index and Data Exploration
- `indexExplorer()` - Explore index structure and content
- `getIndexMappings()` - Retrieve and process index mappings
- `listIndices()` - List available indices with details
- `listSearchSources()` - List available search sources (indices, aliases, data streams)
- `getDocumentById()` - Retrieve specific documents by ID

### Data Processing Utilities
- `esqlResponseToJson()` - Convert ESQL responses to JSON format
- `flattenMapping()` - Flatten complex index mappings
- `cleanupMapping()` - Clean and normalize mapping structures

## Usage Examples

```typescript
import { 
  naturalLanguageSearch,
  generateEsql,
  indexExplorer,
  listSearchSources 
} from '@kbn/onechat-genai-utils';

// Natural language search
const searchResult = await naturalLanguageSearch({
  query: "Show me errors from the last hour",
  indices: ["logs-*"]
});

// Generate ESQL from natural language
const esqlQuery = await generateEsql({
  prompt: "Count documents by status field",
  context: { index: "app-logs" }
});

// Explore index structure
const indexInfo = await indexExplorer({
  index: "metrics-system-*",
  sampleSize: 100
});
```

## Integration

Used by OneChat and other AI-powered features in Kibana to provide intelligent data interaction capabilities through natural language interfaces.
