# @kbn/dissect-heuristics

Utilities and helper functions for extracting Dissect patterns from log messages.

## Overview

This package provides an algorithm to automatically generate [Elasticsearch Dissect processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/dissect-processor.html) patterns by analyzing sample log messages. Unlike Grok patterns which use regular expressions, Dissect patterns use simple literal string delimiters for faster parsing of structured logs.

## Supported Dissect Modifiers

The extraction algorithm supports a subset of Dissect modifiers:

- **Right Padding (`->`)**: Handles variable trailing whitespace
- **Named Skip (`?`)**: Skips fields with non-meaningful constant values
- **Empty Skip (`{}`)**: Anonymous skip fields

**Note**: Reference keys (`*` and `&`) and append modifiers (`+`) are not supported by this implementation.

## Delimiter Reliability Heuristics

The current approach keeps delimiter scoring deliberately simple:

- Position consistency: Delimiters are scored only by how consistently they appear at similar character offsets across messages (variance-based exponential decay).
- Symmetry enforcement: After scoring, any single-character closing bracket `)`, `]`, `}` is discarded unless its matching opener `(`, `[`, `{` was also selected. This avoids generating patterns that fragment bracketed content using an orphan closer.

No additional bracket penalties (mismatch, crossing, depth variance, ordering instability) are applied—favoring simpler, more predictable behavior while still preventing obviously broken delimiter choices.
