# Kubernetes OTel sample data

Generates OTel-native Kubernetes observability data — pods, nodes, deployments,
containers, volumes, logs and alert state — so the Custom Apps prototype has something
realistic to build an Infrastructure page against.

```bash
node x-pack/platform/plugins/private/custom_apps/scripts/k8s_otel_data.js --clean
```

Roughly 670,000 documents in about 20 seconds against a local dev Elasticsearch.

## Why this exists

Nothing in the repo emits OTel-native Kubernetes *metrics*. `@kbn/synthtrace-client`'s
`infra.pod` / `infra.k8sNode` builders are ECS/Metricbeat-shaped, `infra.semconvHost`
is the only semconv entity and it only covers hosts, and `@kbn/data-forge` has no
Kubernetes dataset at all.

It lives here rather than in `@kbn/synthtrace-client` because supporting semconv
Kubernetes there means changing the `InfraDocument` union, the routing transform (which
hardcodes `metrics-${dataset}-default`, so there is no namespace control), the data
stream allowlist and `ensureOtelDataStreamTemplate` — four edits in a package consumed
by APM, Infra, Streams and dozens of FTR suites. `docs.ts` is written so it can graduate
into `semconv_pod.ts` / `semconv_k8s_node.ts` later.

## What it writes

| Signal | Destination |
|---|---|
| pod, node and volume metrics | `metrics-kubeletstatsreceiver.otel-k8sdemo` |
| deployment and container state | `metrics-k8sclusterreceiver.otel-k8sdemo` |
| container logs | `logs-k8s.otel-k8sdemo` |
| alert / health state | `k8s_demo_alert_status` (lookup index) |

The `k8sdemo` namespace is deliberate. Real EDOT writes to `-default`; keeping the seed
in its own namespace means `--clean` can never delete somebody's actual telemetry, and
`metrics-*` index patterns still match so the stock Infra UI can read it too.

Metric values live under `metrics.*` and identity under `resource.attributes.*`. Both are
`type: passthrough` in Elasticsearch's `otel@mappings`, so `k8s.pod.name` and
`resource.attributes.k8s.pod.name` are the same field — the short form works in ES|QL, but
prototype queries should prefer the explicit paths, which cannot be ambiguous.

Field names follow the **collector receivers** (`k8s.deployment.desired`,
`k8s.container.restarts`, `k8s.pod.cpu_limit_utilization`, `k8s.volume.available`), not the
semconv registry's longer spellings, because that is what `kubeletstatsreceiver` and
`k8sclusterreceiver` actually emit and what `metrics_data_access` queries for.

## Three things that will bite you if you change the mappings

1. **`index.look_back_time` defaults to 2h.** The stock `metrics-otel@template` rejects
   any document older than that, so backfilling a day needs the override in
   `templates.ts`. Elasticsearch caps the setting at `7d`, which is why `--lookback`
   is capped there too.
2. **Bulk actions must carry per-document `dynamic_templates`.** The templates in
   `metrics-otel@mappings` have no `match` clause — they are named templates the OTLP
   ingest path selects explicitly. Without them a metric that first arrives as `0` maps
   as `long`, and every later float is silently dropped by `ignore_malformed`.
   Use `gauge_*`, never `counter_*`: ES|QL's `FROM` cannot read counter types.
3. **`index.mapping.synthetic_id` derives `_id` from `_tsid` + `@timestamp`.** Documents
   with identical dimensions at the same instant overwrite each other, which is why each
   family carries a distinct `_metric_names_hash` (`kubeletstats.pod`,
   `kubeletstats.node`, `kubeletstats.volume`, `k8scluster.container`,
   `k8scluster.deployment`).

## Health model

Three states: `active` (red), `clear` (green), `untracked` (grey).

Grey is not derivable from metrics — "no alert set up" is a statement about rule
coverage, not values — and deriving red/green from thresholds would make a pod's health
flip as the user moves the time picker. So health lives in a one-shard lookup index and
joins in after the `STATS` has already collapsed to one row per pod:

```esql
FROM metrics-kubeletstatsreceiver.otel-k8sdemo
| WHERE @timestamp >= NOW() - 15 minutes
| STATS cpu = AVG(metrics.k8s.pod.cpu_limit_utilization)
    BY entity_id = resource.attributes.k8s.pod.uid,
       pod = resource.attributes.k8s.pod.name,
       cluster = resource.attributes.k8s.cluster.name
| WHERE pod IS NOT NULL
| LOOKUP JOIN k8s_demo_alert_status ON entity_id
| EVAL health = COALESCE(alert_status, "untracked")
```

`WHERE pod IS NOT NULL` matters: node documents share the stream and carry no pod uid, so
without it they arrive as a spurious null bucket.

Every metric document also carries `attributes.demo.alert_status`, constant per pod, as a
no-join fallback.

## Realism

Every value is a pure function of `(seed, entityId, timestamp)` — nothing is carried
between intervals, so a run is reproducible and resumable.

```
value = base(pod) × namespaceBaseline(ns) × diurnal(t) × weekly(t) × wander(pod, t) × scenario(pod, t)
```

The namespace baseline table in `topology.ts` is hand-written, not randomised: a cluster
only reads as real when `kube-system` is flat, `search` is hot and spiky, `analytics` is
memory-heavy and `staging` is idle. Random baselines produce a uniform fog.

Twelve pods get a failure archetype — `cpu_hot`, `mem_leak`, `crashloop`,
`noisy_network`, `flapping`. The metric, restart-count and log generators all call the
same `evaluateScenario`, so an error burst always lands on the same timestamps as the CPU
spike that is supposed to explain it, and `k8s.container.restarts` steps exactly when
`memory.working_set` resets. `k8s.deployment.available` counts how many of a
deployment's pods are currently down, so a degraded deployment is degraded *because* of
its pods.

## Re-running

**The script refuses to seed a namespace that already holds data.** Use `--clean` to
replace it, `--namespace <other>` to seed alongside it, or `--append` if you really do
want more.

The refusal is there because deduplication is only partial. The interval grid is snapped
to absolute epoch boundaries and every non-TSDB document has a deterministic `_id`, so a
re-run *within the same interval* is a no-op — but a later run anchors pod start times and
failure windows to a new `now`, which changes the TSDB `_tsid` and therefore the derived
`_id`. Without the guard, running the script twice five minutes apart would silently
double the data, and every pod would draw two hexagons.

Each run prints `indexed / already present / failed`.

## Verifying

The script refreshes and runs its own checks, printing entity counts, the time span, the
health distribution via `LOOKUP JOIN` and the noisiest pods. `--dry-run` prints one
document of each kind without writing anything — the fastest way to eyeball a mapping
change.

## Flags

```
--config            Kibana config file (default config/kibana.dev.yml)
--clean             Delete this seed's data streams, template and index first
--clean-only        Clean and exit
--dry-run           Print one document of each kind and exit
--profile           quick (2h/1m) | default (24h/5m) | deep (7d/30m)
--lookback          How far back to backfill, at most 7d
--interval          Sampling interval, e.g. 30s, 1m, 5m
--namespace         Data stream namespace suffix (default k8sdemo)
--clusters          Number of clusters (default 2)
--pods              Pods per cluster, comma separated (default 540,531)
--nodes             Nodes per cluster, comma separated (default 40,38)
--seed              PRNG seed; the same seed regenerates identical data
--unhealthy         Pods given a failure archetype (default 12)
--logs-per-minute   Cluster-wide log rate (default 25)
--no-logs           Skip log generation
--no-volumes        Skip volume metrics
--no-containers     Skip container state metrics
--batch-size        Documents per bulk request (default 2000)
--concurrency       In-flight bulk requests (default 4)
```
