# @kbn/significant-events-schema

Zod schema definitions and common models for the Significant Events feature, shared between the
`significant_events` server and public code and other consumers (e.g. `@kbn/streams-ai`, `streams_app`).

Extracted from `@kbn/streams-schema`. It no longer depends on it — the dependency direction has
since inverted, and `@kbn/streams-ai` now depends on both.
