# @kbn/classic-stream-flyout

A reusable React component package that provides a multi-step flyout interface for creating classic streams in Kibana.

## Overview

The Create Classic Stream Flyout is a wizard-based interface that guides users through:

1. **Selecting an index template** - Browse, search, and select from available index templates. Selecting a template automatically advances to the next step. Navigating back clears the selection.
2. **Naming and confirming** - Configure the stream name by filling in wildcard portions of the selected index pattern and review template details including index mode, ILM policy phases, and data retention

## Installation

This package is part of the Kibana monorepo and is available as a shared browser package.

```typescript
import { CreateClassicStreamFlyout } from '@kbn/classic-stream-flyout';
```

## Usage

### Basic Usage

```typescript
import React, { useState } from 'react';
import { CreateClassicStreamFlyout } from '@kbn/classic-stream-flyout';
import type { TemplateListItem } from '@kbn/index-management-shared-types';

const MyComponent = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);

  const handleCreate = async (streamName: string) => {
    // Handle the stream creation
    await createClassicStream(streamName);
    setIsFlyoutVisible(false);
  };

  const handleClose = () => {
    setIsFlyoutVisible(false);
  };

  return (
    <>
      <button onClick={() => setIsFlyoutVisible(true)}>Create Classic Stream</button>

      {isFlyoutVisible && (
        <CreateClassicStreamFlyout
          onClose={handleClose}
          onCreate={handleCreate}
          onCreateTemplate={() => {
            /* Navigate to template creation */
          }}
          templates={templates}
          onRetryLoadTemplates={() => {
            /* Retry loading templates */
          }}
        />
      )}
    </>
  );
};
```

### With Custom Validation

```typescript
<CreateClassicStreamFlyout
  onClose={handleClose}
  onCreate={handleCreate}
  onCreateTemplate={handleCreateTemplate}
  templates={templates}
  onRetryLoadTemplates={handleRetry}
  onValidate={async (streamName, template, signal) => {
    // Check for duplicate stream names or higher priority template conflicts
    const isDuplicate = await checkDuplicate(streamName, signal);
    if (isDuplicate) {
      return { errorType: 'duplicate' };
    }

    const conflict = await checkTemplatePriority(streamName, template, signal);
    if (conflict) {
      return {
        errorType: 'higherPriority',
        conflictingIndexPattern: conflict.pattern,
      };
    }

    return { errorType: null };
  }}
/>
```

### With Simulated Template and ILM Policy Details

The flyout can display detailed template information by fetching simulated template data (to show resolved index mode and ILM policy) and ILM policy details (to show lifecycle phases):

```typescript
<CreateClassicStreamFlyout
  onClose={handleClose}
  onCreate={handleCreate}
  onCreateTemplate={handleCreateTemplate}
  templates={templates}
  onRetryLoadTemplates={handleRetry}
  getSimulatedTemplate={async (templateName, signal) => {
    // Fetch simulated template to get resolved index mode and ILM policy name
    return await simulateTemplate(templateName, signal);
  }}
  getIlmPolicy={async (policyName, signal) => {
    // Fetch ILM policy details for phase display
    return await fetchIlmPolicy(policyName, signal);
  }}
/>
```

### With Error State

```typescript
<CreateClassicStreamFlyout
  onClose={handleClose}
  onCreate={handleCreate}
  onCreateTemplate={handleCreateTemplate}
  templates={templates}
  hasErrorLoadingTemplates={true}
  onRetryLoadTemplates={handleRetry}
/>
```

## API Reference

### CreateClassicStreamFlyout Props

| Prop                       | Type                                    | Required | Description                                                                            |
| -------------------------- | --------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `onClose`                  | `() => void`                            | ✓        | Callback when the flyout is closed                                                     |
| `onCreate`                 | `(streamName: string) => Promise<void>` | ✓        | Callback when the stream is created with the final stream name                         |
| `onCreateTemplate`         | `() => void`                            | ✓        | Callback to navigate to create template flow (shown when no templates exist)           |
| `templates`                | `TemplateListItem[]`                    | ✓        | Available index templates to select from                                               |
| `isLoadingTemplates`       | `boolean`                               | ✗        | Whether templates are currently being loaded (defaults to `false`)                     |
| `onRetryLoadTemplates`     | `() => void`                            | ✓        | Callback to retry loading templates after an error                                     |
| `hasErrorLoadingTemplates` | `boolean`                               | ✗        | Whether there was an error loading templates (defaults to `false`)                     |
| `onValidate`               | `StreamNameValidator`                   | ✗        | Async callback to validate the stream name for duplicates and priority conflicts       |
| `getSimulatedTemplate`     | `SimulatedTemplateFetcher`              | ✗        | Async callback to fetch simulated template data for resolved index mode and ILM policy |
| `getIlmPolicy`             | `IlmPolicyFetcher`                      | ✗        | Async callback to fetch ILM policy details by name for phase display                   |

### StreamNameValidator

```typescript
type StreamNameValidator = (
  streamName: string,
  selectedTemplate: IndexTemplate,
  signal?: AbortSignal
) => Promise<{
  errorType: 'duplicate' | 'higherPriority' | null;
  conflictingIndexPattern?: string;
}>;
```

### SimulatedTemplateFetcher

```typescript
type SimulatedTemplateFetcher = (
  templateName: string,
  signal?: AbortSignal
) => Promise<SimulateIndexTemplateResponse | null>;
```

This fetcher calls the index management API to get the resolved template configuration, which includes:

- **Index mode**: The effective index mode (`standard`, `logsdb`, `time_series`, `lookup`)
- **ILM policy name**: The resolved ILM policy name from composed templates

### IlmPolicyFetcher

```typescript
type IlmPolicyFetcher = (policyName: string, signal?: AbortSignal) => Promise<PolicyFromES | null>;
```

### ValidationErrorType

| Error Type         | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `'empty'`          | Stream name has unfilled wildcards or is empty                            |
| `'invalidFormat'`  | Stream name contains invalid characters or format                         |
| `'duplicate'`      | Stream name already exists (from `onValidate`)                            |
| `'higherPriority'` | Stream name conflicts with a higher priority template (from `onValidate`) |
| `null`             | No error, validation passed                                               |

## Stream Name Format Rules

Stream names follow Elasticsearch data stream naming rules:

**Cannot include:**

- `\`, `/`, `*`, `?`, `"`, `<`, `>`, `|`, `,`, `#`, `:`, or space characters

**Cannot start with:**

- `-`, `_`, `+`, or `.ds-`

**Cannot be:**

- `.` or `..`

## Technical Details

### Validation Modes

The flyout implements a validation state machine with three modes:

| Mode       | Description                                  | Behavior                                                  |
| ---------- | -------------------------------------------- | --------------------------------------------------------- |
| **IDLE**   | Initial state, no active validation          | Typing does not trigger validation                        |
| **CREATE** | User clicked Create button                   | Validation in progress, typing aborts and returns to IDLE |
| **LIVE**   | Has validation error, validates on keystroke | Debounced validation on every change (300ms default)      |

### Template Details Display

When `getSimulatedTemplate` is provided, the confirmation step displays:

1. **Index Mode**: Resolved from the simulated template (`standard`, `logsdb`, `time_series`, or `lookup`)
2. **Retention**: Either from the ILM policy (via `getIlmPolicy`) or from the template's data stream lifecycle
3. **ILM Policy Phases**: Detailed phase information (hot, warm, cold, frozen, delete) when an ILM policy is configured

If the simulated template fetch fails, a warning message is displayed and only basic template information is shown.

### Race Condition Handling

The validation and data fetching systems use AbortController to handle race conditions:

- **Create validation**: Aborted when user types during validation
- **Debounced validation**: Previous call aborted when new input arrives
- **Template change**: All pending validations and fetches are aborted
- **Simulated template fetch**: Aborted when navigating back or switching templates
- **ILM policy fetch**: Aborted when template changes or component unmounts
- **Component unmount**: All pending operations cleaned up

## Features

- **Two-Step Wizard**: Guides users through template selection and stream naming with auto-advance on selection
- **Template Search**: Searchable list of available index templates
- **Simulated Template Data**: Fetches resolved template configuration for accurate display
- **Index Mode Display**: Shows the effective index mode from composed templates
- **ILM Policy Display**: Shows ILM policy information with phase details
- **Data Retention Display**: Shows lifecycle data retention for templates without ILM
- **Managed Template Indicator**: Visual indicator for managed templates
- **Multiple Index Pattern Support**: Dropdown selector when template has multiple patterns
- **Dynamic Wildcard Inputs**: Generates input fields based on wildcards in index pattern
- **Comprehensive Validation**: Empty check, format validation, and custom async validation
- **Debounced Live Validation**: Validates on keystroke after first error (300ms debounce)
- **Race Condition Safety**: AbortController-based cancellation for async operations
- **Form State Management**: Reducer-based state with discriminated union types
- **Internationalization**: Full i18n support with formatted messages
- **Accessibility**: ARIA-compliant flyout with proper labeling
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Storybook Integration**: Includes Storybook stories for component development

## Development

### Testing

The package includes comprehensive test coverage:

```bash
# Run tests
yarn jest --config x-pack/platform/packages/shared/kbn-classic-stream-flyout/jest.config.js
```

### Storybook

View and develop the component in Storybook:

```bash
yarn storybook classic_stream_flyout
```
