# @kbn/classic-stream-flyout

> ⚠️ **Work in Progress**: This package is currently under development.

A reusable React component package that provides a multi-step flyout interface for creating classic streams in Kibana.

## Overview

The Create Classic Stream Flyout is a wizard-based interface that guides users through:

- Selecting an index template for the classic stream
- Naming and confirming the classic stream configuration

## Installation

This package is part of the Kibana monorepo and is available as a shared browser package.

```typescript
import { CreateClassicStreamFlyout } from '@kbn/classic-stream-flyout';
```

## Development

### Storybook

View and develop the component in Storybook:

```bash
yarn storybook classic_stream_flyout
```

### Testing

Run tests for the package:

```bash
yarn jest --config x-pack/platform/packages/shared/kbn-classic-stream-flyout/jest.config.js
```
