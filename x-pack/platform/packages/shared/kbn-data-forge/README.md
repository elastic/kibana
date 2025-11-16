# @kbn/data-forge

`kbn-data-forge` is a data generation tool that creates realistic observability data with different scenarios for testing and development purposes.

## Available Datasets

- **`fake_logs`** - Generate log events with various patterns
- **`fake_hosts`** - Generate host metrics (CPU, memory, disk, network)
- **`fake_stack`** - Generate a complete observability stack (APM, logs, metrics, uptime)
- **`service.logs`** - Generate service-specific log events
- **`database_logs`** - Generate database log events

## Running from Terminal

```sh
node x-pack/scripts/data_forge.js [options]
```

### Get Help

```sh
node x-pack/scripts/data_forge.js --help
```

## Options

### Data Generation Options

`--dataset <dataset>` - Dataset to use: `fake_logs`, `fake_hosts`, `fake_stack`
`--scenario <scenario>` - Scenario label for events
`--lookback <datemath>` - When to start indexing (e.g., `now-7d`, `now-1h`)
`--events-per-cycle <number>` - Number of events per cycle
`--index-interval <milliseconds>` - Interval of data in milliseconds
`--payload-size <number>` - Size of ES bulk payload
`--concurrency <number>` - Number of concurrent ES connections
`--event-template <template>` - Name of the event template

### Advanced Options

`--install-kibana-assets` - Install index patterns, visualizations, and dashboards
`--align-events-to-interval` - Index events on interval instead of random distribution
`--reduce-weekend-traffic-by <ratio>` - Reduce weekend traffic (e.g., `0.5` for 50% reduction)
`--ephemeral-project-ids <number>` - Number of ephemeral projects (fake_stack only, last 5-12 hours)

## Some Usage Examples

### Example 1: Simple Host Metrics Generation

Generate host metrics for 10 hosts (minimal command):

```sh
node x-pack/scripts/data_forge.js \
  --events-per-cycle 10 \
  --dataset fake_hosts
```

### Example 2: Simple Fake Stack Data Generation

Generate a complete observability stack with minimal configuration:

```sh
node x-pack/scripts/data_forge.js \
  --events-per-cycle 10 \
  --dataset fake_stack
```

### Example 3: Generate Host Metrics with Assets

Generate host metrics for 7 hosts with Kibana dashboards:

```sh
node x-pack/scripts/data_forge.js \
  --events-per-cycle 7 \
  --lookback now-20m \
  --install-kibana-assets \
  --dataset fake_hosts
```

### Example 4: Generate Logs with Reduced Weekend Traffic

```sh
node x-pack/scripts/data_forge.js \
  --dataset fake_logs \
  --lookback now-30d \
  --reduce-weekend-traffic-by 0.7 \
  --events-per-cycle 1000
```

## Example Configurations

The `example_config/` directory contains many pre-built scenarios:
