# @kbn/storage-adapter scaling experiment — local results

Experiment for [elastic/kibana-team#3973](https://github.com/elastic/kibana-team/issues/3973)
(epic [#3971](https://github.com/elastic/kibana-team/issues/3971)). Measures the ES
heap / shard / cluster-state cost of creating many `@kbn/storage-adapter` indices,
to inform whether one-index-per-type is a viable long-term model.

> **Bottom line:** on this setup the wall we hit first was **cluster-state update
> latency**, not node-heap OOM. ES deduplicates *identical* mappings in cluster
> state, so many indices of the **same** type (e.g. per-space indices) are cheap;
> many **distinct** types are what grows cluster state and slows every cluster
> operation. The default `cluster.max_shards_per_node` (1000) is a separate hard
> ceiling. See caveats — these numbers are a *lower bound* (near-empty shards, small node).

## Setup

- **Machine:** macOS (aarch64), 10 CPUs, 32 GB RAM.
- **Elasticsearch:** 9.6.0-SNAPSHOT, **single node**, `-Xms2g -Xmx2g` (G1GC),
  trial license, started via `node scripts/es snapshot`.
- **Kibana:** dev from source (`--no-base-path`) with the `storageAdapterHeapLab`
  test plugin loaded.
- **Baseline before any test indices:** ~58–80 indices/shards and ~18–21k mapping
  fields already exist (Kibana system indices, Fleet, security, APM/OTel
  templates, etc.), and the node already sits at **~40–55% heap**. This dev stack
  is heavy; a lean deployment would start much lower.
- `cluster.max_shards_per_node` was raised from the **default 1000** to 20000 to
  let us explore *past* the default ceiling.
- Each test index: 1 primary shard, 0 replicas (single node), `dynamic: strict`,
  and **2 documents** (documents are near-irrelevant to the cost we measure).

## Method

The plugin exposes `POST /internal/storage_adapter_heap_lab/generate`
(`numIndices`, `numFields`, `numDocs`, `uniqueFieldsPerIndex`, …) which builds a
realistic flat mapping (keyword/text/numeric/date/boolean mix) via
`@kbn/storage-adapter` and creates the indices + docs server-side. A driver
script ramps `numIndices` in steps, and between steps samples
`_nodes/stats/jvm` + `_cluster/stats` (heap, shards, indices,
`total_field_count`, `total_deduplicated_field_count`, cluster status),
pausing to let heap stabilize. Raw CSVs: [`results/run1_f100.csv`](results/run1_f100.csv),
[`results/run2_f100_unique.csv`](results/run2_f100_unique.csv).

Two runs, both **100 fields/index**, +100 indices/step:

| Run | Mode | What it models |
|-----|------|----------------|
| 1 | **shared** mapping (all indices identical) | many indices of **one** type (e.g. per-space) |
| 2 | **unique** mapping per index (salted field names) | many **distinct** types / consumers |

Heap is noisy under G1GC, so we record both the **immediate** reading after a
step and a **retained** reading (min over the stabilization window ≈ post-GC live
set).

## Results

### Run 1 — shared mapping (mappings deduplicated)

| step | indices/shards | total fields | **dedup fields** | heap immediate | heap retained (post-GC) |
|-----:|---------------:|-------------:|-----------------:|---------------:|------------------------:|
| base | 59   | 18,676  | 16,456 | 1121 MB (52%) | — |
| 1    | 159  | 28,676  | **16,556** | 1329 MB (61%) | 1329 MB |
| 3    | 359  | 48,676  | **16,556** | 631 MB (29%)  | 631 MB |
| 6    | 659  | 78,676  | **16,556** | 1279 MB (59%) | 1279 MB |
| 9    | 959  | 108,676 | **16,556** | 1706 MB (79%) | 567 MB (26%) |
| 12   | 1,259| 138,676 | **16,556** | 1491 MB (69%) | 1491 MB |
| 15   | 1,559| 168,676 | **16,556** | 1862 MB (86%) | 721 MB (33%) |
| 19   | 1,959| 208,676 | **16,556** | 1607 MB (74%) | 1607 MB |

**Key point:** `total_field_count` grows to 208k, but **deduplicated field count
stays flat at 16,556** — ES stores one shared `MappingMetadata` instance on heap
regardless of how many indices reuse it. Retained heap stays in the
~0.6–1.6 GB band (GC recovers to ~600 MB); creation churn drives the transient
peaks. **No failure through ~1,960 indices/shards.**

### Run 2 — unique mapping per index (no deduplication)

| step | indices/shards | total fields | **dedup fields** | heap immediate | heap retained (post-GC) |
|-----:|---------------:|-------------:|-----------------:|---------------:|------------------------:|
| base | 80   | 20,776  | 18,556  | 830 MB (38%)  | — |
| 1    | 180  | 30,776  | **28,556**  | 1629 MB (75%) | 1629 MB |
| 3    | 380  | 50,776  | **48,556**  | 837 MB (39%)  | 837 MB |
| 5    | 580  | 70,776  | **68,556**  | 906 MB (42%)  | 906 MB |
| 7    | 780  | 90,776  | **88,556**  | 898 MB (41%)  | 488 MB (22%) |
| 9    | 980  | 110,776 | **108,556** | 958 MB (44%)  | 703 MB (32%) |
| **10** | **~1,080** | **120,776** | **118,556** | 1562 MB (72%) | **`fetch failed` (timeout)** |

**Key point:** deduplicated field count now tracks total 1:1 (28k→108k) — distinct
mappings are **not** deduplicated. Yet even at ~108k distinct fields the retained
(post-GC) heap is still only ~450–700 MB. What broke at step 10 (~1,000 indices)
was the **generate request timing out**: creating each new distinct-mapping index
is a cluster-state update, and by ~1,000 indices those updates are slow enough
that the HTTP call drops. **ES did not OOM or crash** — it kept applying the
change (shards reached 1,080), and both ES and Kibana stayed up.

At 1,080 distinct-mapping indices the cluster-state `metadata.indices` payload was
**≈ 8.6 MB** (of which heaplab mappings ≈ 6.9 MB). Cluster state is held on the
heap of every node and re-published/diffed on every change, which is why *update
latency* — not steady-state heap — is the first thing to degrade.

### Heap vs indices (run 2, immediate readings)

```mermaid
xychart-beta
    title "Run 2 (distinct mappings): heap % vs #indices"
    x-axis "cumulative indices" [80, 180, 280, 380, 480, 580, 680, 780, 880, 980, 1080]
    y-axis "heap used %" 0 --> 100
    line [38, 75, 74, 39, 48, 42, 20, 41, 48, 44, 72]
```

### Deduplicated fields: shared vs distinct mappings

```mermaid
xychart-beta
    title "Deduplicated field count in cluster state"
    x-axis "cumulative indices" [100, 300, 500, 700, 900]
    y-axis "dedup field count" 0 --> 120000
    line [16556, 16556, 16556, 16556, 16556]
    line [28556, 48556, 68556, 88556, 108556]
```

Flat line = run 1 (shared mapping, deduplicated). Rising line = run 2 (distinct
mappings, not deduplicated).

### Run 3 — forced-GC, per-index heap overhead (the number we actually wanted)

Runs 1–2 read heap under G1GC noise, so we approximated retained heap with a
min-over-window. Run 3 measures it directly: ES was restarted with **`-Xmx6g`**
(so GC pauses don't distort cluster-state application), and before **every**
sample the driver forces a full GC on the ES JVM via `jcmd <pid> GC.run` (twice),
then reads `heap_used` — i.e. the true **post-GC live set**. Indices are added in
**batches of 50**, **distinct** mappings, **40 fields/index**, 20 docs each. Raw:
[`results/run3_gc_f40_batch50.csv`](results/run3_gc_f40_batch50.csv).

The gap between pre-GC and post-GC is enormous and is the whole point: at 2,506
indices the "used" heap read 3,959 MB (64%) but the **post-GC live set was only
609 MB (9%)**. Almost all of the "used" heap during a ramp is collectable churn
from index creation, not retained cost.

| indices/shards | dedup fields | pre-GC used | **post-GC live set** |
|---------------:|-------------:|------------:|---------------------:|
| 6 (baseline)   | 54      | 1816 MB | **228 MB** |
| 206            | 8,054   | 2083 MB | **240 MB** |
| 606            | 24,054  | 3646 MB | **284 MB** |
| 1,006          | 40,054  | 1604 MB | **351 MB** |
| 1,506          | 60,054  | —       | **431 MB** |
| 2,006          | 80,054  | —       | **523 MB** |
| 2,506          | 100,054 | 3959 MB | **609 MB** |

```mermaid
xychart-beta
    title "Run 3: post-GC live set (MB) vs #indices"
    x-axis "indices" [6, 506, 1006, 1506, 2006, 2506]
    y-axis "post-GC live set (MB)" 0 --> 700
    line [228, 274, 351, 431, 523, 609]
```

Ordinary least squares on the 51 post-GC points (R² = **0.986**):

- **≈ 165 KB of retained heap per index** (structural, near-empty shard, 40 fields).
- Equivalently **≈ 4.1 KB per mapped field** — but note *fields and indices are
  collinear here* (every index has exactly 40 fields), so this run cannot separate
  the per-shard from the per-field term; it only gives per-index cost *at 40 fields*.

**This independently reproduces the ES team's formula.** Henning's estimate is
`num_segments*55KB + num_fields*1KB + num_shards*75KB`. For one near-empty index
(1 shard, ~1 segment, 40 fields): `55 + 40 + 75 = 170 KB` — versus **165 KB
measured** (within 3%). So the formula holds, and we can use it to project real
(populated) indices, whose shards carry **~14–30 segments** (14 was the average on
the o11y overview cluster).

| per index | 100 indices | 300 indices | 500 indices |
|-----------|------------:|------------:|------------:|
| structural / near-empty (~165 KB) | ~16 MB | ~48 MB | ~80 MB |
| realistic @14 segments (~0.88 MB) | ~86 MB | ~258 MB | ~430 MB |
| realistic @30 segments (~1.76 MB) | ~172 MB | ~516 MB | ~859 MB |

**Implication for the smallest (1 GB) ES nodes.** #es-distrib confirmed the
smallest ES node is 1 GB RAM, whose JVM heap is ~50% (~512 MB), and Henning's own
conclusion there was that *"if a customer uses all the Kibana features … a 1 GB ES
node is no longer possible."* Our numbers put a slope on that: a consumer that
fans `@kbn/storage-adapter` out to **300 distinct, populated system indices** would
retain **~260–520 MB** of ES heap — i.e. it can consume the **entire usable heap of
a 1 GB node on its own**. Structural cost alone is negligible (~48 MB); the danger
is **segments once the indices hold real data**, exactly the term our near-empty
local shards under-count.

## Findings

1. **Shards are cheap in heap here; mappings are the cost — and identical
   mappings are deduplicated.** Many indices of *one* type (the per-space pattern
   used by e.g. Context Engine signals) share a single `MappingMetadata` on heap.
   Adding 1,900 such indices did not meaningfully raise retained heap.
2. **Distinct types are the real multiplier.** Each distinct mapping is stored
   independently and inflates cluster state (~8.6 MB at ~1,000 × 100-field types).
3. **The first wall is cluster-state update latency, not node-heap OOM.** On a
   2 GB single node, index-creation throughput collapsed around ~1,000
   distinct-mapping indices (steps went from ~36 s/100 indices to a timeout),
   while retained heap was still < 1 GB.
4. **The default `cluster.max_shards_per_node` = 1000 is an independent hard
   ceiling.** With Kibana's own ~60 shards, a consumer creating hundreds of
   indices (× spaces) can hit it on a small cluster and index creation then fails
   with `validation_exception`.
5. **Retained per-index heap ≈ 165 KB structural, and the ES-team formula holds.**
   The forced-GC run (run 3) measured a clean **~165 KB/index** (R²=0.986) at 40
   fields on near-empty shards, matching Henning's `segments*55KB + fields*1KB +
   shards*75KB` to within 3%. Projected to **populated** shards (~14–30 segments)
   this is **~0.9–1.8 MB/index**, so ~300 such indices ≈ **260–520 MB** — enough to
   exhaust the usable heap of a 1 GB ES node on their own.
6. **The run-2 "wall" was heap pressure, not a hard cluster-state limit.** Giving
   ES 6 GB (run 3) let us reach **2,506 distinct-mapping indices with no timeout**
   (per-batch create latency grew ~19 s → ~48 s but kept succeeding). On 2 GB the
   collapse at ~1,000 indices was GC pauses starving cluster-state application —
   i.e. the binding constraint really is **available heap**, which is exactly what
   is scarce on small nodes.

## Caveats (important)

- **Lower bound on heap (structural only).** Test shards hold 2–20 docs (~1
  segment), so per-shard Lucene/segment heap (FSTs, doc values, norms, points) is
  essentially absent. Production shards with real data carry ~14–30 segments and
  cost materially more. Run 3's "realistic" projections add that segment term via
  the ES-team formula rather than measuring it locally — treat those as estimates,
  and prefer the serverless "memory as returned by ES" measurement for ground truth.
- **Fields/indices collinear in run 3.** Every index used exactly 40 fields, so the
  regression gives per-index cost *at 40 fields*; it can't independently attribute
  per-shard vs per-field heap. A field-count sweep would be needed to separate them.
- **Small, busy node.** 2 GB heap and a heavy dev stack (~40–55% heap before we
  start) compress the usable range and make heap noisy; absolute MB values are
  environment-specific. The *shape* of the curves is the takeaway, not the
  absolute numbers.
- **Stateful only.** Serverless has different shard/heap economics (object-store
  backed, autoscaling). The serverless arm of #3973 — deploy via
  `ci:project-deploy-elasticsearch` and watch the "memory as returned by ES"
  autoscaling dashboard — is still needed and not covered here.
- **Authz cost, observed but not measured.** `asInternalUser` (`kibana_system`)
  could not create arbitrary indices; new storage-adapter index patterns must be
  granted in the `kibana_system` role. This is a real per-consumer operational
  cost, orthogonal to heap. (The experiment used the current superuser to isolate
  the heap/shard question.)

## Implications for the epic

- One-index-per-type is fine for a **bounded** number of types. The risk scales
  with the number of **distinct mappings** and total **shards**, via cluster-state
  size/update latency and the per-node shard ceiling — surfacing well before node
  heap OOM on a small cluster.
- Per-space fan-out of a *single* type is cheaper than feared on the heap side
  (mapping dedup) but still spends a shard each (shard ceiling + real per-shard
  heap once populated).
- These local results support taking the shared-index-mode idea seriously and
  bringing concrete cluster-state/shard budgets (and serverless specifics) to the
  ES team (#es-distrib), rather than treating heap-per-shard as the binding
  constraint.

## Reproduce

```bash
node scripts/es snapshot                       # terminal 1 (add -Xmx to taste)
node scripts/kibana --dev --no-base-path       # terminal 2
# shared mappings:
NUM_FIELDS=100 STEP_INDICES=100 STEPS=50 OUT=/tmp/run1.csv \
  node x-pack/platform/plugins/private/storage_adapter_heap_lab/scripts/run_experiment.js
# distinct mappings:
NUM_FIELDS=100 STEP_INDICES=100 STEPS=50 UNIQUE_FIELDS=true OUT=/tmp/run2.csv \
  node x-pack/platform/plugins/private/storage_adapter_heap_lab/scripts/run_experiment.js

# forced-GC per-index overhead (run 3): restart ES with -Xmx6g, pass the ES pid so
# the driver forces a full GC (jcmd GC.run) before each sample -> true live set:
ES_PID=$(pgrep -f org.elasticsearch.bootstrap.Elasticsearch) \
NUM_FIELDS=40 DOCS_PER_INDEX=20 STEP_INDICES=50 STEPS=50 UNIQUE_FIELDS=true \
OUT=/tmp/run3.csv \
  node x-pack/platform/plugins/private/storage_adapter_heap_lab/scripts/run_experiment.js
node x-pack/platform/plugins/private/storage_adapter_heap_lab/scripts/analyze_overhead.js /tmp/run3.csv
```
