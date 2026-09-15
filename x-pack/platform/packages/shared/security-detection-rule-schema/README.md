# @kbn/security-detection-rule-schema

Shared type definitions and compile functions for the Security Solution's Alerting v2
detection rule types. Lives in the platform `shared` group so that both the
`alerting_v2` plugin and Security Solution plugins can import it without
creating a forbidden cross-plugin dependency.

The package owns:

- The shared detection-rule fragment (`detectionRuleCommonFields`, `DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS`) — fields that every detection rule type carries.
- The `security.detection.query` type: schema (`customQueryBuilderFieldsSchema`), manifest, compile function, and full `BuilderTypeDefinition`.
- The `security.detection.threshold` type: schema (`thresholdBuilderFieldsSchema`), manifest, compile function, and full `BuilderTypeDefinition`.
- The `enrichDetectionRuleEvent` enrichment hook shared by both types.
- ES|QL AST construction helpers (`buildQuotedIndexSource`, `buildFullTextFilter`) used by both compile functions to ensure consistent, injection-safe output.

The manifest/fold layering requires this package to sit here: the `alerting_v2`
plugin imports the manifests to assemble the saved-object mappings and fold them
into model versions, while the Security Solution plugin imports the full
`BuilderTypeDefinition` to register the types at startup.
