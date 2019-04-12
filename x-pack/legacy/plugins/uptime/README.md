# Uptime Monitoring

## Purpose

The purpose of this plugin is to provide users of Heartbeat more visibility of what's happening
in their infrasturcture. It's primarily built using React and Apollo's GraphQL tools.

## Layout

There are three sections to the app, `common`, `public`, and `server`.

### common

Contains GraphQL types, constants and a few other files.

### public

Components come in two main types, queries and functional. Queries are extended from Apollo's queries
type which abstracts a lot of the GraphQL connectivity away. Functional are dumb components that
don't store any state.

The `lib` directory controls bootstrapping code and adapter types.

There is a `pages` directory; each view gets its own page component.

The principal structure of the app is stored in `uptime_app.tsx`.

### server

There is a `graphql` directory which contains the resolvers, schema files, and constants.

The `lib` directory contains `adapters`, which are connections to external resources like Kibana
Server, Elasticsearch, etc. In addition, it contains domains, which are libraries that provide
functionality via adapters.

There's also a `rest_api` folder that defines the structure of the RESTful API endpoints.

## Testing

### Unit tests

From `~/kibana/x-pack`, run `node scripts/jest.js`.

### Functional tests

In one shell, from **~/kibana/x-pack**:
`node scripts/functional_tests-server.js`

In another shell, from **~kibana/x-pack**:
`node ../scripts/functional_test_runner.js --grep="{TEST_NAME}"`.

### API tests

In one shell, from **~/kibana/x-pack**:
`node scripts/functional_tests-server.js`

In another shell, from **~kibana/x-pack**:
`node ../scripts/functional_test_runner.js --config test/api_integration/config.js --grep="{TEST_NAME}"`.
