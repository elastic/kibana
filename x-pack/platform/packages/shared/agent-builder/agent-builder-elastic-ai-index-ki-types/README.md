# @kbn/agent-builder-elastic-ai-index-ki-types

Every KI type id for the Kibana content indexed into the Elastic AI Index via the Semantic Metadata Layer (SML).

Each id is shared by the `SmlTypeDefinition.id` the owning plugin registers with `agentBuilderSml.registerType()`
and the `aiIndex: { read: [...] }` entry of the feature privilege that grants read access to that content. Neither
side can import from the other — the plugin registering the KI type (previously SML type) and 
the plugin declaring the privilege sit on opposite ends of a plugin dependency chain, so an import either way 
would be circular. Hence this package.

An id also becomes part of the generated privilege action (`ai_index:<kiType>/read`) and is stamped on every
document the crawler writes (`type_id`, plus the `<kiType>://<origin_id>` origin URI). Renaming an id means
new documents will be added by the crawler, but the old documents will remain in the index until they are manually deleted.
User roles need no changes. A role grants a feature privilege by name (e.g. `feature_dashboard.all`), never an
individual action string, and Kibana rebuilds the action list behind each name from the feature registration on
startup — so roles pick up the renamed action on their own.
