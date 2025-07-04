# @kbn/event-stacktrace

This package contains components that render event (error, log, span) stack traces.

## Unit Tests (Jest)

```
node scripts/jest --config x-pack/platform/packages/shared/kbn-event-stacktrace/README.md [--watch]

```

## Storybook

### Start
```
yarn storybook event_stacktrace
```

All files with a .stories.tsx extension will be loaded. You can access the development environment at http://localhost:9001.