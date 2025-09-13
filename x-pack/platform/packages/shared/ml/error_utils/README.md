# @kbn/ml-error-utils

Error handling utilities for Machine Learning features in Kibana. This package provides standardized error types, processing functions, and type guards for handling ML-specific errors across Elasticsearch and Kibana.

## Overview

The `@kbn/ml-error-utils` package centralizes error handling for Machine Learning functionality in Kibana. It provides utilities to process, format, and type-check various error types that can occur during ML operations, including Elasticsearch errors, HTTP fetch errors, and ML-specific response errors.

## Package Details

- **Package Type**: `shared-common`
- **Owner**: `@elastic/ml-ui`
- **Visibility**: Shared across platform
- **Dependencies**: `@hapi/boom`, `@elastic/elasticsearch`, `@kbn/core-http-browser`

## Core Components

### Error Types
- `MLResponseError` - Standard ML API response error structure
- `MLHttpFetchError` - HTTP fetch error with ML context
- `EsErrorBody` - Elasticsearch error response structure
- `EsErrorRootCause` - Root cause information from Elasticsearch
- `MLErrorObject` - Generic ML error object interface

### Error Processing Functions
- `extractErrorMessage()` - Extracts human-readable error messages
- `extractErrorProperties()` - Extracts error properties for debugging

### Type Guards
- `isBoomError()` - Checks if error is a Boom error
- `isErrorString()` - Checks if value is an error string
- `isEsErrorBody()` - Checks if error is an Elasticsearch error body
- `isMLResponseError()` - Checks if error is an ML response error

### Request Error Class
- `MLRequestFailure` - Specialized error class for ML request failures

## Usage Examples

### Processing Errors
```typescript
import { extractErrorMessage, extractErrorProperties } from '@kbn/ml-error-utils';

try {
  // ML API call
  const result = await mlApiCall();
} catch (error) {
  const message = extractErrorMessage(error);
  const properties = extractErrorProperties(error);
  
  console.error('ML operation failed:', message);
  console.debug('Error details:', properties);
}
```

### Type Guards
```typescript
import { 
  isMLResponseError, 
  isEsErrorBody, 
  isBoomError 
} from '@kbn/ml-error-utils';

function handleError(error: unknown) {
  if (isMLResponseError(error)) {
    console.error(`ML Error ${error.statusCode}: ${error.message}`);
  } else if (isEsErrorBody(error)) {
    console.error('Elasticsearch error:', error.error);
  } else if (isBoomError(error)) {
    console.error('HTTP error:', error.message);
  }
}
```

### ML Request Failure
```typescript
import { MLRequestFailure } from '@kbn/ml-error-utils';

// Throw standardized ML errors
throw new MLRequestFailure(
  'Failed to train model',
  { 
    statusCode: 400,
    error: 'BadRequest',
    message: 'Invalid training data'
  }
);
```

### Working with Error Types
```typescript
import type { 
  MLResponseError, 
  EsErrorBody, 
  MLHttpFetchError 
} from '@kbn/ml-error-utils';

const handleMLError = (error: MLResponseError) => {
  return {
    title: 'ML Operation Failed',
    message: error.message,
    statusCode: error.statusCode
  };
};
```

## Integration with ML Features

This package is extensively used throughout Kibana's ML ecosystem:

- **Data Visualizer**: Error handling for field analysis and data drift detection
- **ML Plugins**: Standardized error processing across all ML features
- **UI Components**: Consistent error display and user messaging
- **API Integration**: Error handling for Elasticsearch ML APIs

The package ensures consistent error handling patterns across all ML functionality, providing users with clear error messages and developers with structured error information for debugging and monitoring.
