# Isomer render service

A standalone HTTP service that draws Isomer compositions to PNG and PDF with Kibana's primitive packs, built from this checkout into a Docker image. It is the local stand-in for an Isomer runtime deployed beside [page-render-service](https://github.com/elastic/page-render-service), and it is shaped after that service: one render at a time, a `429` when busy, readiness once the render process is warm, a drain on SIGTERM, ECS JSON logs, and a Prometheus busy signal.

Demo only, like the rest of the demo lane. `ISOMER_RENDER_SERVICE.md` at the repository root is the proposal this scaffold supports.

## Build and run

```sh
node x-pack/platform/plugins/shared/isomer/scripts/render_service/bundle.js
cd x-pack/platform/plugins/shared/isomer/target/render_service
docker build -t isomer-render-service:local .
docker run --rm -p 127.0.0.1:3000:3000 isomer-render-service:local
./smoke.sh http://localhost:3000 /tmp/isomer-smoke
```

`bundle.js` runs esbuild over `service.ts` and the plugin's render process (`server/render_host/main.ts`) and writes a Docker context to `target/render_service`:

- `dist/service.js` and `dist/main.js`: the two bundles. Kibana's own packages are inside them (`@kbn/isomer-*`, `@kbn/i18n`, `@kbn/fs`). The published packages they sit on stay external and install from npm in the image, pinned to this checkout's versions: `@elastic/isomer-sdk`, `-runtime` and `-image-takumi`, `@elastic/distillate`, React, Elastic Charts, EUI's theme packages, jsdom, Vega, `@napi-rs/canvas`. That split is the one an internal publish of the packs would make permanent.
- `dist/kibana/...`: the assets the render process reads from the checkout, at their checkout paths: Kibana's Inter and Elastic UI Numeric fonts, and the world outlines fixture the maps pack draws under maps. `repo_info_shim.ts` replaces `@kbn/repo-info` so `fromRoot` resolves there (`ISOMER_RENDER_ASSETS` overrides it).
- `package.json`: the externals, with the git SHA as the version.
- `Dockerfile`: `node:24-slim`, production dependencies only, `tini` as PID 1, an unprivileged user. It installs with `--legacy-peer-deps`, as Kibana's pnpm install is not strict about peers either, and applies Kibana's `vega-canvas` patch by hand, since Vega's Node build cannot be required from CommonJS.

To run the bundle without Docker, point Node at Kibana's `node_modules` for the externals:

```sh
NODE_PATH=$PWD/node_modules PORT=3100 node x-pack/platform/plugins/shared/isomer/target/render_service/dist/service.js
```

## Contract

| Route | Purpose |
|---|---|
| `GET /healthz` | Liveness. |
| `GET /readyz` | `200` once the render process has drawn its first composition and the pod is not draining; otherwise `503` with a `reason`. |
| `GET /status` | Build SHA, Node and Isomer package versions, and a vocabulary digest per pack. |
| `GET /metrics` | `isomer_render_demand`: the share of the last `AUTOSCALING_WINDOW_SECONDS` spent rendering, page-render-service's busy signal without its waiting term. |
| `GET /v1/capabilities` | The runtime's `getCapabilities()` plus `formats`, the per-pack primitive lists and vocabulary digests, and the package versions. |
| `GET /v1/examples?packs=components,charts` | A composition built from every primitive's first example, for a smoke test. |
| `POST /v1/render-composition` | `{ composition, options?, expects? }`. `options` are the render host's draw options (`format: "png" \| "pdf"`, `width`, `height`, `frame`, `theme`, `scale`, `chartSize`, `dashboardWidth`, `chartHints`, `metadata`). The bytes come back as `image/png` or `application/pdf` with `x-render-total-ms` and `x-isomer-vocabulary`. |

Errors are JSON, `{ error, code?, ... }`:

| Status | When |
|---|---|
| `400` | Not JSON, an unknown draw option, or `INVALID_COMPOSITION` with the runtime's validation errors. The composition is validated before it can take the render slot. |
| `409` | `VOCABULARY_MISMATCH`: `expects.vocabulary` names a different vocabulary than this service renders. The body carries both digests and the per-pack ones. |
| `413` | The body is over `BODY_LIMIT_BYTES`. |
| `429` | A render is in progress. `x-isomer-render-service-rejection: saturated`, `Connection: close`. |
| `503` | Draining. `x-isomer-render-service-rejection: draining`. |
| `504` | `RENDER_TIMEOUT`: the draw overran `RENDER_TIMEOUT_MS`; the render process was killed and the next draw starts a new one. |
| `500` | `RENDER_FAILED`, with the render process's message. |

The vocabulary digest (`server/vocabulary.ts`, shared with the plugin) is a SHA-256 over each pack's composed JSON Schema with its prose stripped, and one over all of them. It stands in for the versioned snapshots and `packs` stamp of [elastic/isomer#201](https://github.com/elastic/isomer/issues/201): two runtimes with the same digest accept the same compositions. The SDK version is reported beside it on `/status`.

Kibana is the client: set `xpack.isomer.renderService.url` and the `isomer` plugin's `getRenderHost()` draws here (`server/render_host/remote.ts`), sending `expects.vocabulary` from its own runtime and retrying `429` and `503` until its budget runs out.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | |
| `LISTEN_HOST` | `127.0.0.1` | The image sets `0.0.0.0`. |
| `BODY_LIMIT_BYTES` | 20 MB | The dashboard draw route's limit. |
| `RENDER_TIMEOUT_MS` | `60000` | One draw's ceiling. |
| `RENDER_HEAP_MB` | `256` | The render process's V8 old-space cap. |
| `RENDER_IDLE_MS` | 10 min | How long the render process stays warm with nothing to draw. |
| `AUTOSCALING_WINDOW_SECONDS` | `60` | The busy signal's window. |
| `BUILD_SHA` | the bundle's | Surfaced on `/status` and in every log line. |
| `ISOMER_RENDER_ASSETS` | `dist/kibana` | Where fonts and fixtures are read from. |

There is no caller authentication: that is page-render-service's UIAM and mTLS layer, which this service would sit behind unchanged.

## Process model

The service process holds a light runtime (the packs without drawing engines) for validation and capabilities. Draws go to a forked render process, the plugin's own `createRenderHost`, which owns jsdom, Skia, Elastic Charts and takumi and is replaced if a draw overruns. That is the same two-process shape as page-render-service's service and browser containers, and the render process could become a sidecar the same way.

Validation in the service process is a gate: the composition is forwarded as received, and the render process validates what it draws on its own. Run it on Node 24, Kibana's pinned version. On Node 22 the host run drew every chart as its data table.
