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

During delimiter detection the algorithm applies layered reliability penalties to structural bracket characters, plus a final symmetry filter:

1. Balance scan: For each message a lightweight pass over `()`, `[]`, `{}` records any unmatched opener or stray closer. Delimiters containing those characters have their position score heavily reduced (×0.2) so they rarely pass the threshold.
2. Crossing pattern detection: A second pass builds a simple stack and records pairs like `([)` where the closer does not match the most recent opener (improper nesting order). Delimiters containing characters involved in any crossing pair receive an additional strong penalty (×0.15).
3. Depth variance analysis: For each bracket character we collect its nesting depth samples. Highly unstable structural usage (variance > 6) triggers a strong penalty (×0.4); moderate instability (variance > 3) a lighter penalty (×0.7). This filters out delimiters drawn from erratic bracket usage while keeping consistently nested ones.
4. Relative ordering instability: First-occurrence ordering of different opener types `(`, `[`, `{` is compared across messages. If the relative order flips (e.g. sometimes `(` precedes `[` and sometimes the reverse) those bracket characters receive a penalty (×0.25) to reduce adoption of inconsistent early structural tokens.
5. Symmetry enforcement: After scoring, pure single-character closing brackets `)`, `]`, `}` are removed unless their matching opener also survived selection. Multi-character tokens containing a closer (e.g. `]:`, `] `) are retained since they often act as natural end delimiters. This prevents orphan closing brackets from fragmenting bracketed content.

Only characters directly implicated (unmatched, crossing, unstable ordering, high-variance, or orphaned) are penalized or filtered; properly balanced and consistently nested bracket delimiters in well‑formed logs remain eligible.
