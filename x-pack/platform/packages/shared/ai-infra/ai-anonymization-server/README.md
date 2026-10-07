# @kbn/ai-anonymization-server

The anonymization pipeline used by the inference plugin's `chatComplete`: rule execution (regex in
a worker pool, NER via an Elasticsearch ML model), masking, and de-anonymization of responses and
streams, plus the schema and default for the `ai:anonymizationSettings` advanced setting.

The package is stateless: Elasticsearch clients, loggers and the `RegexWorkerService` instance are
passed in by the caller. The inference plugin owns the worker pool's lifecycle and wires the
package into `chatComplete`.

Owned by `@elastic/security-investigations`. Rule types live in `@kbn/ai-anonymization-common`.
