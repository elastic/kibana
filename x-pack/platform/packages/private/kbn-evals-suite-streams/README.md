# @kbn/evals-suite-streams

Evaluation test suite for streaming AI features in Kibana. This package provides testing infrastructure and evaluation tools for validating AI-powered streaming functionality, including response quality and performance metrics.

## Overview

The `@kbn/evals-suite-streams` package contains testing utilities and evaluation frameworks specifically designed for AI streaming features in Kibana, providing comprehensive validation of AI responses and streaming performance.

## Package Details

- **Package Type**: `private` (platform internal)
- **Purpose**: AI streaming feature evaluation and testing
- **Dependencies**: Playwright for end-to-end testing, Jest for unit testing

## Core Components

### Evaluation Framework
Testing infrastructure for validating AI streaming responses and behavior.

### Performance Testing
Tools for measuring streaming performance, latency, and throughput.

### Response Quality Assessment
Utilities for evaluating the quality and accuracy of AI-generated streaming responses.

## Configuration

### Playwright Configuration
End-to-end testing setup for streaming scenarios with browser automation.

### Jest Configuration  
Unit testing configuration for streaming utility functions and components.

## Usage Examples

```typescript
// Evaluation test example
import { evaluateStreamingResponse } from '@kbn/evals-suite-streams';

describe('AI Streaming Evaluation', () => {
  it('should validate streaming response quality', async () => {
    const result = await evaluateStreamingResponse({
      prompt: 'Analyze system metrics',
      expectedMetrics: ['accuracy', 'latency', 'completeness']
    });
    
    expect(result.accuracy).toBeGreaterThan(0.8);
    expect(result.latency).toBeLessThan(2000);
  });
});
```

## Integration

Used by Kibana's AI development team to ensure streaming AI features meet quality and performance standards before release.

## Running the suite

Start scout:

```bash
node scripts/scout.js start-server --stateful
```

Now run the tests exactly like a normal Scout/Playwright suite in another terminal:

```bash
node scripts/playwright test --config x-pack/platform/packages/private/kbn-evals-suite-streams/playwright.config.ts
```