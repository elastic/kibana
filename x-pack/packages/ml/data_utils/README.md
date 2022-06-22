# @kbn/ml-data-utils

This package includes utility functions provided by the ML team to be used in Kibana plugins related to data manipulation and verification.

<!-- INSERT GENERATED DOCS START -->

### `buildSamplerAggregation` (function)

Wraps the supplied aggregations in a sampler aggregation.
A supplied samplerShardSize (the shard_size parameter of the sampler aggregation)
of less than 1 indicates no sampling, and the aggs are returned as-is.

**Parameters:**

- aggs (`any`)
- samplerShardSize (`number`)

**returns:** Record<string, AggregationsAggregationContainer>

### `getSamplerAggregationsResponsePath` (function)

**Parameters:**

- samplerShardSize (`number`)

**returns:** string[]

### `stringHash` (function)

Creates a deterministic number based hash out of a string.

**Parameters:**

- str (`string`)

**returns:** number

### `getAggIntervals` (function)

Returns aggregation intervals for the supplied document fields.

<!-- INSERT GENERATED DOCS END -->
