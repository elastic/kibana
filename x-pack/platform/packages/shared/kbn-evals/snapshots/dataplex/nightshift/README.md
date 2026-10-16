## Nightshift snapshot datasets (Dataplex)

Dataplex aspects YAML for the Nightshift datasets in `gs://nightshift-datasets`. Metadata only; the snapshot
loader does not read these files. `gcs_path` is the Elasticsearch repository a replay points at; anything
else about a dataset is described in its YAML and in the documentation stored next to it in GCS.

```bash
node scripts/evals dataplex sync --dry-run
node scripts/evals dataplex sync orca_bench_data_0418_2026_10_01
```
