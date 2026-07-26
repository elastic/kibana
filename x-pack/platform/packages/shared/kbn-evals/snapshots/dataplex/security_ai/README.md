## Security AI snapshot dataset registry (Dataplex)

This folder contains **Dataplex aspects YAML** files used to register Security-owned snapshot datasets (stored in GCS) following the Snapshot Dataset Management best practices.

- **These files are metadata only** (bucket/path/description/etc). They are not used by `@kbn/es-snapshot-loader` at runtime.
- **Do not commit credentials** (service account JSON, API keys, tokens).

To register a dataset, run `gcloud dataplex entries create ... --aspects=<path-to-yaml>`.

