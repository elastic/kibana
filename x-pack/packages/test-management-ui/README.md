# @kbn/test-management-ui

A standalone web UI for discovering and running Kibana test suites (Jest, Scout, and FTR) from a unified interface.

## Quick Start

```bash
# From the Kibana root directory
node scripts/test_management_ui

# Or with options
node scripts/test_management_ui --port 5678 --root /path/to/kibana
```

Then open [http://localhost:5678](http://localhost:5678) in your browser.

## Features

- **Config Discovery**: Automatically scans the repo for Jest, Jest Integration, Scout (Playwright), and FTR configs
- **Test Runner**: Execute any discovered test config from the UI with real-time log streaming
- **Server Management**: Start/stop Elasticsearch and Kibana dev servers for integration/E2E tests
- **Live Output**: Server-Sent Events stream test output and server logs in real time
- **Search & Filter**: Find configs by name, path, package, or type

## Architecture

```
test-management-ui/
├── server/
│   ├── index.ts              # HTTP server with REST API + SSE
│   ├── config_discovery.ts   # Discovers test configs via git ls-files
│   ├── test_runner.ts        # Spawns test processes, streams output
│   └── server_manager.ts     # Manages ES/Kibana dev servers
├── ui/
│   └── index.html            # React SPA with EUI-styled components
├── cli.ts                    # CLI entry point
├── types.ts                  # Shared type definitions
└── index.ts                  # Package exports
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/configs` | Get all discovered test configs |
| POST | `/api/configs/refresh` | Re-scan for configs |
| GET | `/api/configs/search?q=&type=` | Search/filter configs |
| GET | `/api/runs` | List all test runs |
| POST | `/api/runs` | Start a new test run |
| GET | `/api/runs/:id` | Get run details |
| POST | `/api/runs/:id/stop` | Stop a running test |
| GET | `/api/servers` | Get server statuses |
| POST | `/api/servers/elasticsearch` | Start Elasticsearch |
| POST | `/api/servers/kibana` | Start Kibana |
| POST | `/api/servers/:name/stop` | Stop a server |
| GET | `/api/events` | SSE stream for live updates |
