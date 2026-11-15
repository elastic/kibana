# @kbn/significant-events-schema

Zod schema definitions and common models for the Significant Events feature, shared between the
`significant_events` server and public code and other consumers: `significant_events_app`,
`nightshift`, `nightshift_investigations`, `@kbn/nightshift-ai`, `@kbn/investigation-output` and the
two evals suites (`@kbn/evals-suite-significant-events`, `@kbn/evals-suite-nightshift-investigations`).

Extracted from `@kbn/streams-schema`. It no longer depends on it, and neither `@kbn/streams-ai` nor
`streams_app` depends on this package anymore.
