# @kbn/dissect-heuristics

Utilities and helper functions for extracting Dissect patterns from log messages.

## Overview

This package provides an algorithm to automatically generate [Elasticsearch Dissect processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/dissect-processor.html) patterns by analyzing sample log messages. Unlike Grok patterns which use regular expressions, Dissect patterns use simple literal string delimiters for faster parsing of structured logs.

## Key Differences from Grok

| Aspect | Grok | Dissect |
|--------|------|---------|
| **Matching** | Regular expressions | Literal string delimiters |
| **Pattern** | `%{PATTERN_TYPE:field}` | `%{field}` |
| **Speed** | Slower (regex engine) | Faster (string splitting) |
| **Flexibility** | Can match complex patterns | Only matches exact delimiters |
| **Best for** | Variable log formats | Consistent structured logs |

## Usage

```typescript
import { extractDissectPatternDangerouslySlow } from '@kbn/dissect-heuristics';

const logs = [
  '1.2.3.4 - - [30/Apr/1998:22:00:52 +0000] "GET /index.html HTTP/1.0" 200 3171',
  '5.6.7.8 - - [01/May/1998:10:15:30 +0000] "POST /api/data HTTP/1.1" 201 512',
  '9.0.1.2 - - [02/May/1998:14:22:18 +0000] "PUT /update HTTP/1.1" 200 128',
];

const pattern = extractDissectPatternDangerouslySlow(logs);
// Returns: '%{clientip} %{ident} %{auth} [%{timestamp}] "%{verb} %{request} HTTP/%{httpversion}" %{status} %{size}'
```

## Supported Dissect Modifiers

The extraction algorithm supports a subset of Dissect modifiers:

- **Right Padding (`->`)**: Handles variable trailing whitespace
- **Named Skip (`?`)**: Skips fields with non-meaningful constant values
- **Empty Skip (`{}`)**: Anonymous skip fields

**Note**: Reference keys (`*` and `&`) and append modifiers (`+`) are not supported by this implementation.

## API

### `extractDissectPatternDangerouslySlow(messages: string[]): string`

⚠️ **WARNING: DO NOT RUN THIS FUNCTION ON THE MAIN THREAD**

Extracts a Dissect pattern from an array of log messages by analyzing common delimiters and structure.

**Parameters:**
- `messages`: Array of log message strings to analyze

**Returns:**
- A Dissect pattern string

## Implementation Status

🚧 **This package is currently under development.** See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for details.

## Related Packages

- [`@kbn/grok-heuristics`](../kbn-grok-heuristics) - Grok pattern extraction (regex-based, more flexible)
- [`@kbn/sample-log-parser`](../../../../../packages/kbn-sample-log-parser) - Sample log generation for testing
