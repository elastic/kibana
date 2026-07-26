## Significant Events snapshot dataset registry (Dataplex)

This folder contains **Dataplex aspects YAML** files used to register Significant Events snapshot datasets stored in GCS.

- **These files are metadata only** (bucket/path/description/etc). They are not used by `@kbn/es-snapshot-loader` at runtime.
- **Do not commit credentials** (service account JSON, API keys, tokens).

### GCS layout

All otel-demo snapshots share a single ES snapshot repository at:

```
gs://significant-events-datasets/<run-id>/otel-demo/
```

Each scenario (e.g. `healthy-baseline`, `payment-unreachable`) is an **ES snapshot name** within that repository. The `gcs_path` in each YAML appends the scenario ID for Dataplex uniqueness.

### Syncing to Dataplex

```bash
# Dry run (preview)
node scripts/evals dataplex sync --dry-run

# Sync all entries
node scripts/evals dataplex sync

# Sync a single entry by file name
node scripts/evals dataplex sync sigevents_otel_demo_healthy_baseline_2026_03_27
```

### Adding a new snapshot

1. Copy an existing YAML and update `gcs_path`, `description`, `indices`, and `timestamp_range`.
2. Run `node scripts/evals dataplex sync --dry-run` to verify.
3. Run `node scripts/evals dataplex sync` (or `--print-commands` if you lack Dataplex write permissions).
