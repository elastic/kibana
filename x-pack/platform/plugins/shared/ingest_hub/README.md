# Ingest Hub

Cross-solution onboarding page for adding data sources and integrations. Gated behind the `ingestHub.enabled` feature flag.

Other plugins register ingest flows during `start` via `registerIngestFlow`, which renders onboarding tiles grouped by category.
