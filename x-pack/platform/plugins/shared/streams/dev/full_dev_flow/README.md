# Local Streams full dev flow (UI engineers)

End-to-end path from a clean machine to a working local Streams backend: Canvas,
a published unit, logs in the project ES, and collector metrics. You start four
long-lived processes. One script does everything else.

Login is always `elastic_serverless` / `changeme`.
Do not commit or push the controller patches the script applies.

## What you get

```
browser / curl  →  motel (:14318)
                 →  WarpStream (kind)
                 →  streams collector (unit `default` in project-dev)
                 →  local serverless ES
                      logs-application.otel-dev / .otel-prod
                      metrics-streams.metrics.otel-default
```

## Checkouts

Put these next to each other (the script looks for `../streams-controller`):

```
…/Elastic/Code/kibana
…/Elastic/Code/streams-controller
…/Elastic/Code/streams-config-distributor
```

Override with `STREAMS_CONTROLLER=/path/to/streams-controller` if needed.

`docker.elastic.co/observability-ci` does **not** publish `:latest` for
`streams-collector` or `hosted-otel-collector`. The script does not pin a
SHA in this repo. It uses the `streams-collector` tag from your
`streams-controller` checkout (`dev/values.yaml`, then `helm/values.yaml`)
and, for motel, the image already running on kind. Override only if you
need a specific SHA:

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

In the Kibana checkout, add the Tilt snippet plus the canvas flags (without them
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
user-facing collector telemetry and the local TLS skip. Tilt rebuilds the
controller from that local source. Do not commit those patches.

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
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh
```

That one command:

1. Enables user-facing collector telemetry in the local controller checkout
2. Ensures `es/dev` → `host.docker.internal` and the motel collector
3. Port-forwards motel to `localhost:14318` if needed
4. Creates an ES API key
5. `PUT`s unit `default` through Kibana (`/internal/streams/unit/default`)
6. Re-applies the local-ES certificate hack on `spec.artifact`
7. Sends `dev` / `prod` OTLP logs through motel
8. Waits for demo logs (and collector metrics when they land)

## 7. Use it

- Canvas: http://localhost:5601/app/streams/new-experience/
- Discover / ES|QL as `elastic_serverless`:

```esql
FROM logs-application.otel-dev
FROM logs-application.otel-prod
FROM metrics-streams.metrics.otel-default
```

`env=prod` bodies are uppercased; `env=dev` bodies are not. Collector metrics
include `streams.step.*` and `streams.destination.*` with `target_id=dev` and
`unit_id=default`.

## Try a different unit

Edit `unit.yaml` in this directory, then re-run the script. `seed` / the default
command `PUT`s that file through Kibana (after substituting `__API_KEY__`), so
Canvas and the collector pick up the new graph.

Keep `__API_KEY__` on any `elasticsearch` destination that needs a key. The
document still needs `sources`, `destinations`, and `pipelines`. The
transpiler currently wants a static `index` (no templates, no
`index_patterns`).

The motel demo traffic is OTLP logs with `resource.attributes.env` of `dev` or
`prod`. `wait`, Discover examples, and `reset` data-stream deletes still assume
the stock `logs-application.otel-*` names. If you change routing or indexes,
reload Canvas and query the indexes you authored; the wait step may warn.

## Day to day

Leave the four processes running. When you want a fresh unit and traffic:

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh
```

`status` / `setup` / `seed` / `reset` are listed in
`./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh --help`.

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh reset    # drop Canvas unit, demo data, StreamUnit CR, controller patches
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh          # publish and send traffic again
```

`reset` also `POST`s `/internal/streams/unit/default/_reset` so Canvas drops
the graph (those nodes live in Kibana saved objects, not the kind StreamUnit).
Then it deletes the demo data streams, the `project-dev/default` CR, the minted
API key, and restores `streams-controller` `dev/values.yaml` and
`internal/workload/telemetry.tpl.yml` to HEAD. That last step also discards any
other uncommitted edits in those two files. Reload Canvas after reset.

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
| Unit PUT 404 "Streams unit API is not enabled" | Add the canvas flags in step 3 and restart Kibana. |
| Unit PUT 503 | Distributor Tilt is down, or `kibana.dev.yml` snippet is missing. |
| Script sits on `PUT .../unit/default` | The PUT itself is usually done in a few seconds. The script then waits for `spec.artifact` (not Ready). Ctrl-C and re-run if it exceeds ~90s. |
| `es serverless` bind error on 8443 | Distributor must use `-- --port 18443`. |
| Collector `unknown type: "otlp_http"` | Collector image is too old for user-facing telemetry. Use a newer `STREAMS_COLLECTOR_TAG` from `streams-controller` helm values. |
| Motel `ImagePullBackOff` / `:latest: not found` | These CI images have no `latest` tag. Re-run this script (it now keeps the motel image already on the cluster). |
| Collector `x509` / unknown authority | Re-run the script (it re-applies the artifact CA hack). |
| No `telemetry.yaml` on the unit ConfigMap | Controller patch did not land; check `STREAMS_CONTROLLER` and Tilt rebuild. |
| Motel `502` / TLS handshake | Motel ingress must stay `scheme: http`. |
| Empty data after ~2 minutes | `kubectl --context kind-streams -n project-dev logs deploy/default --since=10m` |
