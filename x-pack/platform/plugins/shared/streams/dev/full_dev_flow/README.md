# Local Streams full dev flow (UI engineers)

End-to-end path from a clean machine to a working local Streams backend: Map,
a published unit, logs in the project ES, and collector metrics. You start four
long-lived processes. One script does everything else.

Login is always `elastic_serverless` / `changeme`.
Do not commit or push the controller patches the script applies.

## What you get

```
browser / curl  →  motel ingest (:14318)
                 →  WarpStream (kind)
                 →  streams collector (unit `default` in project-dev)
                 →  local serverless ES
                      logs-application.otel-dev / .otel-prod

unit collector telemetry
                 →  Kafka motel.events.metrics.dev
                 →  motel-index-collector
                 →  metrics-streams.otel-default
```

## Checkouts

Put these next to each other (the script looks for `../streams-controller`
and `../hosted-otel-collector`):

```
…/Elastic/Code/kibana
…/Elastic/Code/streams-controller
…/Elastic/Code/streams-config-distributor
…/Elastic/Code/hosted-otel-collector
```

Override with `STREAMS_CONTROLLER` / `STREAMS_HOSTED_OTEL_COLLECTOR` if needed.

`docker.elastic.co/observability-ci` does **not** publish `:latest` for
`streams-collector` or `hosted-otel-collector`. The script does not pin a
SHA in this repo. It uses the `streams-collector` tag from your
`streams-controller` checkout (`dev/values.yaml`, then `helm/values.yaml`,
then the `streams-transpiler` commit in `go.mod`). Motel uses the image
already running on kind, or `git-<12>` from `../hosted-otel-collector`.
Override only if you need a specific SHA:

```sh
export STREAMS_COLLECTOR_TAG=git-dd1bdf93c90a
export STREAMS_MOTEL_COLLECTOR_TAG=git-3b3b80ebe91f
```

The script mints a local ES API key into `$TMPDIR/streams-full-dev/` (mode
`600`) and substitutes it into a throwaway unit file. That directory is not
in this repo. `reset` deletes the key. Do not copy those files into git.

## 0. One-time prerequisites

```sh
brew install kind tilt kubectl helm gh go ko jq
gh auth login
gh auth setup-git
docker login docker.elastic.co    # https://docker-auth.elastic.co/

# Kibana checkout
cd /path/to/kibana
corepack enable
nvm use                           # version from .nvmrc
pnpm kbn bootstrap
```

Docker Desktop must be running. Collector pods reach ES via `host.docker.internal`.

## 1. Create the kind cluster

From **either** `streams-controller` or `streams-config-distributor`:

```sh
make kind
```

This creates `kind-streams` and a registry on `localhost:5001`. Idempotent.
If 5001 is taken, free it first.

## 2. Start the distributor (leave this terminal up)

```sh
cd /path/to/streams-config-distributor
tilt up --context kind-streams -- --port 18443
```

Open http://localhost:10350 and wait until resources are ready.

Port **18443** is required: local serverless ES uses 8443 for UIAM.

Tilt writes certs and a Kibana snippet to `.tilt/kibana/`. Keep those paths.

## 3. Point Kibana at the distributor

In the Kibana checkout, add the Tilt snippet plus the Map flags (without them
the unit API returns 404):

```sh
DIST=/path/to/streams-config-distributor
{ cat "$DIST/.tilt/kibana/kibana.dev.yml.snippet"
  cat <<'YAML'
xpack.streams.canvas.enabled: true
uiSettings.overrides:
  'observability:streamsEnableCanvas': true
YAML
} >> config/kibana.dev.yml
```

If you already have a `kibana.dev.yml`, paste the snippet and the two flags into
it instead of appending blindly. Restart Kibana after cert rotation or cluster
recreate.

## 4. Start the controller (leave this terminal up)

```sh
cd /path/to/streams-controller
tilt up --port 10351
```

Open http://localhost:10351 and wait until the controller and WarpStream are ready.

You do **not** have to edit `dev/values.yaml` by hand. The script turns on
user-facing collector telemetry. Tilt rebuilds the controller from that local
source. Do not commit those patches.

## 5. Start serverless ES and Kibana (leave these terminals up)

```sh
# Kibana checkout, terminal 1
pnpm es serverless --projectType=observability

# Kibana checkout, terminal 2
pnpm serverless-oblt
```

- Kibana: http://localhost:5601 — `elastic_serverless` / `changeme`
- ES: `https://localhost:9200` (TLS; HTTP curl returns an empty reply)

```sh
curl -sk -u elastic_serverless:changeme https://localhost:9200
```

## 6. Finish the stack

From the **Kibana** checkout:

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh status   # optional: see what is missing
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh setup
```

`setup` patches the local controller so pods can reach ES, deploys motel
ingest and the motel index collector (Kafka metrics → ES), and port-forwards
ingest to `localhost:14318`. It then prints the Kibana setting to add
(restart Kibana after):

```yaml
xpack.cloud.managed_otlp.url: "http://localhost:14318"
```

To publish a canned unit and send traffic with no further prompts:

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh seed
```

`seed`:

1. Ensures `es/dev` → `host.docker.internal`, motel ingest is reachable, and the index collector is up
2. Mints a destination ES API key
3. `PUT`s unit `default` through Kibana (`/internal/streams/unit/default`)
4. Re-applies the local-ES certificate hack on `spec.artifact`
5. Mints a **source-scoped** API key for source `input`
6. Sends 90 OTLP logs through motel (45 `dev` + 45 `prod`), then 5
   invalid-`@timestamp` docs per destination into the failure store
7. Waits for demo logs, `::failures`, and collector metrics (`metrics-streams.otel-default`)

To exercise a source you created in Map, copy the logs endpoint and generated
API key from the source flyout:

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh test_ui_flow
```

It prompts for the URL and key first (copy those from Map, including Generate
key), then re-applies the local ES TLS hack and sends 100 logs (90 valid, 10
mapping conflicts aimed at the destination failure store). Map save
republishes the unit and drops that TLS block, so generate the key *before*
the script patches, and do not save Map while it is sending. The source must
already be connected to a destination. Override the prompts with
`STREAMS_TEST_ENDPOINT` and `STREAMS_TEST_API_KEY` if you want it
non-interactive.

`$0` with no arguments still runs `setup` then `seed`.

## 7. Use it

- Map: http://localhost:5601/app/streams/new-experience/map
- Discover / ES|QL as `elastic_serverless`:

```esql
FROM logs-application.otel-dev
FROM logs-application.otel-prod
FROM logs-application.otel-dev::failures
FROM logs-application.otel-prod::failures
FROM metrics-streams.otel-default
```

`env=prod` bodies are uppercased; `env=dev` bodies are not. Collector metrics
include `streams.step.*` and `streams.destination.*` with `target_id=dev` and
`unit_id=default`.

## Try a different unit

Edit `unit.yaml` in this directory, then re-run the script. `seed` / the default
command `PUT`s that file through Kibana (after substituting `__API_KEY__`), so
Map and the collector pick up the new graph.

Keep `__API_KEY__` on any `elasticsearch` destination that needs a key. The
document still needs `sources`, `destinations`, and `pipelines`. The
transpiler currently wants a static `index` (no templates, no
`index_patterns`).

The motel demo traffic is OTLP logs with `resource.attributes.env` of `dev` or
`prod`. `wait`, Discover examples, and `reset` data-stream deletes still assume
the stock `logs-application.otel-*` names. If you change routing or indexes,
reload Map and query the indexes you authored; the wait step may warn.

## Day to day

Leave the four processes running. When you want a fresh unit and traffic:

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh seed
```

`status` / `setup` / `seed` / `test_ui_flow` / `reset` are listed in
`./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh --help`.

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh reset    # drop Map unit, demo data, StreamUnit CR, controller patches
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh          # publish and send traffic again
```

`reset` also `POST`s `/internal/streams/unit/default/_reset` so Map drops
the graph (those nodes live in Kibana saved objects, not the kind StreamUnit).
Then it deletes the demo data streams, the `project-dev/default` CR, the minted
API key, and restores `streams-controller` `dev/values.yaml` to HEAD. That last
step also discards any other uncommitted edits in that file. Reload Map after
reset.

## Teardown

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh reset
# Ctrl-C the ES and Kibana terminals
# Ctrl-C both Tilt UIs, then:
cd /path/to/streams-config-distributor && tilt down --context kind-streams
cd /path/to/streams-controller && tilt down
make kind-delete    # from either repo
```

## Troubleshooting

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh status
```

| Symptom | Fix |
| --- | --- |
| `http://localhost:9200` returns nothing | ES is HTTPS. Use `https://` and `--cacert` / `-k`. |
| Unit PUT 404 "Streams unit API is not enabled" | Add the Map flags in step 3 and restart Kibana. |
| Unit PUT 503 | Distributor Tilt is down, or `kibana.dev.yml` snippet is missing. |
| Script sits on `PUT .../unit/default` | The PUT itself is usually done in a few seconds. The script then waits for `spec.artifact` (not Ready). Ctrl-C and re-run if it exceeds ~90s. |
| `es serverless` bind error on 8443 | Distributor must use `-- --port 18443`. |
| Collector `unknown type: "otlp_http"` | Collector image is too old for user-facing telemetry. Use a newer `STREAMS_COLLECTOR_TAG` from `streams-controller` helm values. |
| Motel `ImagePullBackOff` / `:latest: not found` | These CI images have no `latest` tag. Re-run this script (it now keeps the motel image already on the cluster). |
| Collector `x509` / unknown authority | Saving Map republishes the unit and drops the local TLS patch. Re-run `seed` or `test_ui_flow` (they re-apply it). |
| No `telemetry.yaml` on the unit ConfigMap | Controller patch did not land; check `STREAMS_CONTROLLER` and Tilt rebuild. |
| Motel `502` / TLS handshake | Motel ingress must stay `scheme: http`. |
| Empty data after ~2 minutes | `kubectl --context kind-streams -n project-dev logs deploy/default --since=10m` |
| Logs in, `metrics-streams.otel-default` empty | Index collector is missing or cannot reach ES. Re-run `setup` / `seed`. Logs: `kubectl --context kind-streams -n motel-index-collector logs deploy/motel-index-collector --since=10m` |
