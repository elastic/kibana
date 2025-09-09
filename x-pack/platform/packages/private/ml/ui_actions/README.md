# @kbn/ml-ui-actions

UI action definitions for Machine Learning integrations in Kibana. This package provides action types and triggers that enable ML functionality to be integrated with other Kibana features through the UI actions framework.

## Overview

The `@kbn/ml-ui-actions` package contains UI action definitions that allow Machine Learning features to be triggered from various contexts within Kibana, including anomaly detection job creation and field categorization actions.

## Package Details

- **Package Type**: `private` (platform internal)
- **Owner**: `@elastic/ml-ui`
- **Purpose**: ML feature integration through UI actions
- **Dependencies**: Kibana UI actions framework

## Core Actions

### ML Anomaly Detection Actions
- `CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_ACTION` - Action for creating anomaly detection jobs from pattern analysis
- `CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER` - Trigger for anomaly detection job creation

### AIOps Field Categorization Actions
- `ACTION_CATEGORIZE_FIELD` - Action for field categorization analysis
- `CATEGORIZE_FIELD_TRIGGER` - Trigger for field categorization
- `categorizeFieldTrigger` - Trigger implementation

## Context Types

### CreateCategorizationADJobContext
Context interface for creating categorization-based anomaly detection jobs.

### CategorizeFieldContext
Context interface for field categorization actions.

## Usage Examples

```typescript
import { 
  CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_ACTION,
  ACTION_CATEGORIZE_FIELD,
  categorizeFieldTrigger,
  type CreateCategorizationADJobContext,
  type CategorizeFieldContext 
} from '@kbn/ml-ui-actions';

// Register ML actions with UI actions service
uiActions.registerAction({
  id: CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_ACTION,
  // ... action implementation
});

// Trigger field categorization
const context: CategorizeFieldContext = {
  field: 'message',
  dataView: dataViewId
};

uiActions.executeTriggerActions(categorizeFieldTrigger.id, context);
```

## Integration

These actions enable ML functionality to be accessible from various parts of Kibana, including data exploration interfaces, field analysis tools, and pattern detection features.
