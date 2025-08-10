# @kbn/failure-store-modal

A reusable React component package that provides a modal interface for configuring failure store settings in Kibana. This package contains stateless components for managing failure store configurations including retention periods and custom settings.

## Overview

The Failure Store Modal is a form-based modal component that allows users to:
- Enable or disable failure store functionality
- Configure retention periods (default or custom)
- Set custom retention values with various time units (days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds)
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

## API Reference

### FailureStoreModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onCloseModal` | `() => void` | ✓ | Callback function called when the modal is closed |
| `onSaveModal` | `(data: FailureStoreFormData) => void` | ✓ | Callback function called when the form is submitted with valid data |
| `failureStoreProps` | `FailureStoreFormProps` | ✓ | Configuration object for the failure store settings |

### FailureStoreFormProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `failureStoreEnabled` | `boolean` | ✓ | Whether failure store is currently enabled |
| `defaultRetentionPeriod` | `string` | ✓ | Default retention period (e.g., "30d", "7h") |
| `customRetentionPeriod` | `string` | ✗ | Custom retention period if different from default |

### FailureStoreFormData (Return Type)

| Property | Type | Description |
|----------|------|-------------|
| `failureStoreEnabled` | `boolean` | Whether failure store should be enabled |
| `customRetentionPeriod` | `string \| undefined` | Custom retention period if specified |

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

