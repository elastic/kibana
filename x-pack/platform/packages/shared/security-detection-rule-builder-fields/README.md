# @kbn/security-detection-rule-builder-fields

Storage declarations for every detection rule builder type registered with Alerting v2.

## What the two halves of the manifest answer

`detectionRuleBuilderFieldsManifest` has two halves that answer different questions.

`currentMappings` says which typed sub-fields a detection rule indexes today. It is assembled from objects grouped by the fields they describe and placed directly into `metadata.builder_fields.properties`. This object never shrinks: a leaf that no current schema produces keeps its mapping, because some published version added it and the static mappings must carry every addition any version declared.

`versions` says what each released version added, in the order the versions shipped. A version's `addedMappings` are always literals, never references to the mapping objects that make up `currentMappings`. This is the one rule the package lives by.

## Why a version's additions are literals

A version records what one release added, and a deployment applies it once. If a version's `addedMappings` spread the grouped mapping objects, adding a leaf to one of those objects later would change what version 1 declares retroactively. A deployment that already applied version 1 would never apply it again, so it would never reindex its rules under the new leaf, while a fresh deployment would apply versions in order and would. The same build would index a field on some deployments and not on others with no error anywhere to say so.

`KEYWORD_SUB_FIELD_IGNORE_ABOVE` is the one name a literal is allowed to carry. It names a derived ceiling: a constant whose value cannot cause a leaf to appear or vanish retroactively.

## The one-reference rule

This package's `kbn_references` has exactly one entry: `@kbn/alerting-v2-rule-builders`, the framework's own contract package. No Zod, no plugin, no other solution module. This is a reviewable property of the package and the whole point of the redesign. The framework's build gains the manifest and a helper it already owns, and nothing else. If you find yourself wanting to add a second reference, that is the boundary breaking, not a missing import.

## What the package does not contain

No schema, no ownership record, no display text, and no function other than a backfill. Those artifacts reach the framework through `registerBuilderType` in the `security_detections` plugin, not through this package.
