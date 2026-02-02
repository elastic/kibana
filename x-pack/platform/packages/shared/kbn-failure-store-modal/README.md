# @kbn/failure-store-modal

A reusable React component package that provides a modal interface for configuring failure store settings in Kibana. This package contains stateless components for managing failure store configurations including retention periods and custom settings.

## Overview

The Failure Store Modal is a form-based modal component that allows users to:
- Enable or disable failure store functionality
- Configure retention periods (default, custom, or disabled)
- Set custom retention values with various time units (days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds)
- Disable lifecycle management for failure store retention
- Inherit failure store configuration from parent streams or index templates
- Validate and submit failure store configurations

## Installation

This package is part of the Kibana monorepo and is available as a shared browser package.

```typescript
import { FailureStoreModal } from '@kbn/failure-store-modal';
```

## Usage

### Basic Usage

```typescript
import React, { useState } from 'react';
import { FailureStoreModal } from '@kbn/failure-store-modal';

const MyComponent = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSave = (data) => {
    console.log('Failure store config:', data);
    // Handle the saved configuration
    setIsModalVisible(false);
  };

  const handleClose = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <button onClick={() => setIsModalVisible(true)}>
        Configure Failure Store
      </button>
      
      {isModalVisible && (
        <FailureStoreModal
          onCloseModal={handleClose}
          onSaveModal={handleSave}
          failureStoreProps={{
            failureStoreEnabled: false,
            defaultRetentionPeriod: '30d'
          }}
        />
      )}
    </>
  );
};
```

### With Custom Retention Period

```typescript
<FailureStoreModal
  onCloseModal={handleClose}
  onSaveModal={handleSave}
  failureStoreProps={{
    failureStoreEnabled: true,
    defaultRetentionPeriod: '30d',
    customRetentionPeriod: '7d'
  }}
/>
```

### With Disabled Lifecycle Management

```typescript
<FailureStoreModal
  onCloseModal={handleClose}
  onSaveModal={handleSave}
  failureStoreProps={{
    failureStoreEnabled: true,
    defaultRetentionPeriod: '30d',
    retentionDisabled: true
  }}
  canShowDisableLifecycle={true}
/>
```

### With Custom Disabled Button Label

```typescript
<FailureStoreModal
  onCloseModal={handleClose}
  onSaveModal={handleSave}
  failureStoreProps={{
    failureStoreEnabled: true,
    defaultRetentionPeriod: '30d'
  }}
  canShowDisableLifecycle={true}
  disableButtonLabel="Forever"
/>
```

### With Inheritance Options

```typescript
<FailureStoreModal
  onCloseModal={handleClose}
  onSaveModal={handleSave}
  failureStoreProps={{
    failureStoreEnabled: true,
    defaultRetentionPeriod: '30d',
    customRetentionPeriod: '40d'
  }}
  inheritOptions={{
    canShowInherit: true,
    isWired: true,
    isCurrentlyInherited: false
  }}
/>
```

## API Reference

### FailureStoreModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onCloseModal` | `() => void` | ✓ | Callback function called when the modal is closed |
| `onSaveModal` | `(data: FailureStoreFormData) => Promise<void> \| void` | ✓ | Callback function called when the form is submitted with valid data |
| `failureStoreProps` | `FailureStoreFormProps` | ✓ | Configuration object for the failure store settings |
| `inheritOptions` | `InheritOptions` | ✗ | Configuration for inheritance behavior from parent stream or index template |
| `showIlmDescription` | `boolean` | ✗ | Whether to display tier-specific messaging (defaults to `true`) |
| `canShowDisableLifecycle` | `boolean` | ✗ | Whether to show the option to disable lifecycle management (defaults to `false`) |
| `disableButtonLabel` | `string` | ✗ | Custom label for the disabled lifecycle button. If not provided, defaults to "Disabled" |

### FailureStoreFormProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `failureStoreEnabled` | `boolean` | ✓ | Whether failure store is currently enabled |
| `defaultRetentionPeriod` | `string` | ✗ | Default retention period (e.g., "30d", "7h") |
| `customRetentionPeriod` | `string` | ✗ | Custom retention period if different from default |
| `retentionDisabled` | `boolean` | ✗ | Whether lifecycle management is disabled for retention |

### InheritOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `canShowInherit` | `boolean` | ✓ | Whether to display the inherit toggle |
| `isWired` | `boolean` | ✓ | If true, shows "parent stream" labels; if false, shows "index template" labels |
| `isCurrentlyInherited` | `boolean` | ✓ | Initial state of the inherit toggle |

### FailureStoreFormData (Return Type)

| Property | Type | Description |
|----------|------|-------------|
| `failureStoreEnabled` | `boolean` | Whether failure store should be enabled |
| `customRetentionPeriod` | `string \| undefined` | Custom retention period if specified |
| `retentionDisabled` | `boolean \| undefined` | Whether lifecycle management is disabled |
| `inherit` | `boolean \| undefined` | Whether to inherit configuration from parent stream or index template |

## Supported Time Units

The modal supports the following time units for retention periods:

- `d` - Days
- `h` - Hours  
- `m` - Minutes
- `s` - Seconds
- `ms` - Milliseconds
- `micros` - Microseconds
- `nanos` - Nanoseconds

## Features

- **Form Validation**: Built-in validation for retention period values
- **Internationalization**: Full i18n support with formatted messages
- **Accessibility**: ARIA-compliant modal with proper labeling
- **State Management**: Uses Kibana's form hook library for robust form state management
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Storybook Integration**: Includes Storybook stories for component development and testing
- **Inheritance Support**: Optional inheritance from parent streams or index templates
  - When inheritance is enabled, all configuration fields are disabled
  - Supports both wired (parent stream) and classic (index template) inheritance modes
- **Lifecycle Management**: Optional ability to disable lifecycle management for failure store retention
  - When enabled via `canShowDisableLifecycle`, users can choose to disable lifecycle management
  - Provides flexibility for advanced retention configurations

## Development

### Testing

The package includes comprehensive test coverage:

```bash
# Run tests
yarn jest --config x-pack/platform/packages/shared/kbn-failure-store-modal/jest.config.js
```

### Storybook

View and develop the component in Storybook:

```bash
yarn storybook failure_store_modal
```

