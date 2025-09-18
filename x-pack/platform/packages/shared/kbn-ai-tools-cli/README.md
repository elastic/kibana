# @kbn/ai-tools-cli

Command-line tools for AI dataset management and processing. This package provides utilities for loading, processing, and managing datasets from Hugging Face and other sources for AI feature development in Kibana.

## Overview

The `@kbn/ai-tools-cli` package contains command-line utilities and functions for working with AI datasets, particularly for loading and processing Hugging Face datasets for use in Kibana's AI features.

## Package Details

- **Package Type**: `shared-common`
- **Visibility**: Shared across platform
- **Purpose**: AI dataset management and processing
- **Dependencies**: Hugging Face dataset libraries

## Core Functions

### loadHuggingFaceDatasets()
Function for loading datasets from Hugging Face Hub for AI model training and testing.

### PREDEFINED_HUGGING_FACE_DATASETS
Configuration of predefined datasets commonly used in Kibana AI features.

## Types

### HuggingFaceDatasetSpec
TypeScript interface defining the structure of Hugging Face dataset specifications.

## Usage Examples

```typescript
import { 
  loadHuggingFaceDatasets,
  PREDEFINED_HUGGING_FACE_DATASETS,
  type HuggingFaceDatasetSpec 
} from '@kbn/ai-tools-cli';

// Load a predefined dataset
const dataset = await loadHuggingFaceDatasets(
  PREDEFINED_HUGGING_FACE_DATASETS.commonCrawl
);

// Load custom dataset
const customSpec: HuggingFaceDatasetSpec = {
  name: 'my-dataset',
  version: '1.0.0',
  config: { /* dataset config */ }
};

const customDataset = await loadHuggingFaceDatasets(customSpec);
```

## Integration

Used by AI development workflows in Kibana to manage training data and test datasets for AI-powered features.
