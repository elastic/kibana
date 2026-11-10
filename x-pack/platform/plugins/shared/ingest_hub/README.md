# Ingest Hub

Cross-solution onboarding page for adding data sources and integrations. Gated behind the `ingestHub.enabled` feature flag.

Other plugins register ingest flows during `start` via `registerIngestFlow`, which renders onboarding tiles grouped by category.

## Feature flags

| Flag | Default | Effect |
| --- | --- | --- |
| `ingestHub.enabled` | `false` | Shows the Ingest Hub app. |
| `ingestHub.onboardingEnabled` | `false` | Enables the onboarding app and routes under `/app/onboarding`. |
| `fleet.awsIdentityFederationEnabled` | `true` | Fleet kill switch. When off, the AWS onboarding flow offers only access keys for managed integrations. |
