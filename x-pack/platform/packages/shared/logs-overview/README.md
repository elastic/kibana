# @kbn/logs-overview

Log overview UI components for Kibana observability features. This package provides reusable React components for displaying log data overviews, including loading states, error handling, and various log source configurations.

## Overview

The `@kbn/logs-overview` package contains React components and utilities for building log overview interfaces in Kibana's observability features, supporting multiple log source types and configurations.

## Package Details

- **Package Type**: `shared-common`
- **Visibility**: Shared across platform
- **Purpose**: Log data visualization components
- **Dependencies**: React, Kibana observability libraries

## Core Components

### LogsOverview
Main component for displaying log data overviews with customizable configuration.

### LogsOverviewErrorContent
Error state component for handling log loading failures.

### LogsOverviewLoadingContent
Loading state component displayed while log data is being fetched.

## Configuration Types

### Log Source Configurations
- `DataViewLogsSourceConfiguration` - Configuration for data view-based log sources
- `IndexNameLogsSourceConfiguration` - Configuration for index name-based sources
- `SharedSettingLogsSourceConfiguration` - Configuration for shared settings sources
- `LogsSourceConfiguration` - Union type for all log source configurations

### Feature Flags
- `LogsOverviewFeatureFlags` - Feature flag definitions for logs overview functionality

## Usage Examples

```typescript
import { 
  LogsOverview,
  LogsOverviewErrorContent,
  LogsOverviewLoadingContent,
  type LogsOverviewProps,
  type LogsSourceConfiguration 
} from '@kbn/logs-overview';

// Basic logs overview
const logsConfig: LogsSourceConfiguration = {
  type: 'index_name',
  indexName: 'logs-*'
};

<LogsOverview
  dependencies={dependencies}
  logSourceConfiguration={logsConfig}
/>

// With error handling
<LogsOverviewErrorContent
  error={error}
  onRetry={handleRetry}
/>

// Loading state
<LogsOverviewLoadingContent />
```

## Integration

Used by Kibana's observability features to provide consistent log overview interfaces across different applications and use cases.
