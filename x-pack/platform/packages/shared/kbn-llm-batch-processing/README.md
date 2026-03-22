# @kbn/llm-batch-processing

Hierarchical batch processing utilities for LLM workloads with adaptive sizing and concurrent execution.

## Overview

This package provides a generic batching algorithm for LLM tasks that:
- **Exceed context window limits** - Split large inputs into manageable batches
- **Benefit from parallel processing** - Process batches concurrently
- **Need consistent output** - Merge results hierarchically

Originally extracted from Attack Discovery for platform-wide reuse.

## Installation

```typescript
import { batchProcess } from '@kbn/llm-batch-processing';
```

## Quick Start

```typescript
const documents = [...];  // 1000 documents

const result = await batchProcess({
  input: documents,
  splitStrategy: 'token-based',
  maxTokensPerBatch: 8000,
  processFn: async (batch) => {
    return await llm.summarize(batch.join('\n'));
  },
  mergeFn: async ([a, b]) => {
    return await llm.summarize([a, b].join('\n\n---\n\n'));
  },
  maxConcurrentBatches: 5,
  tokenEstimator: (doc) => doc.split(' ').length * 1.3,  // Rough estimate
});

console.log(result.output);  // Final merged summary
console.log(result.stats);   // { batches: 10, mergeRounds: 4, durationMs: 12000 }
```

## API Reference

### `batchProcess<TInput, TOutput>(config: BatchConfig): Promise<BatchResult>`

Main entry point for batch processing.

**Parameters:**
- `input: TInput[]` - Items to process
- `splitStrategy` - How to split: `'token-based'`, `'item-based'`, or `'custom'`
- `maxTokensPerBatch?` - Max tokens per batch (for token-based)
- `maxItemsPerBatch?` - Max items per batch (for item-based)
- `processFn` - Process one batch through LLM
- `mergeFn` - Merge two outputs hierarchically
- `maxConcurrentBatches?` - Concurrency limit (default: 3)
- `tokenEstimator?` - Estimate tokens for an item (for token-based)
- `onProgress?` - Progress callback

**Returns:**
- `output: TOutput` - Final merged result
- `stats: BatchStats` - Execution statistics

### Low-Level Utilities

```typescript
// Token-aware splitting
tokenBasedSplit<T>(items: T[], maxTokens: number, estimator: (item: T) => number): T[][]

// Fixed-size splitting
itemBasedSplit<T>(items: T[], maxItems: number): T[][]

// Hierarchical merge
hierarchicalMerge<T>(outputs: T[], mergeFn: ([a, b]: [T, T]) => Promise<T>): Promise<T>
```

## Use Cases

| Team | Use Case | Benefit |
|------|----------|---------|
| **Security** | Attack Discovery (500 alerts) | Exceeds 8K context, hierarchical merge maintains coherence |
| **Observability** | Log summarization (1000+ entries) | Parallel processing with consistent output |
| **ML** | Document classification (500 docs) | Batch sizing optimized for model context limits |

## Architecture

**Split → Process → Merge:**
1. Split large input into batches (token-aware or fixed-size)
2. Process batches concurrently (with backpressure)
3. Merge results hierarchically (log(N) rounds)

**Zero Dependencies:** Inline concurrency control, no external libraries.

## License

Elastic License 2.0
