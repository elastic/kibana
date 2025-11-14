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
