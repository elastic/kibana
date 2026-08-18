# @kbn/agent-builder-elastic-ai-index-ki-types

Every KI type id for the Kibana content indexed into the Elastic AI Index via the Semantic Metadata Layer (SML).

Each id is shared by the `SmlTypeDefinition.id` the owning plugin registers with `agentBuilderSml.registerType()`
and the `aiIndex: { read: [...] }` entry of the feature privilege that grants read access to that content. Neither
side can import from the other — the plugin registering the SML type and the plugin declaring the privilege sit on
opposite ends of a plugin dependency chain, so an import either way would be circular. Hence this package.

An id also ends up in the generated privilege action (`ai_index:<kiType>/read`) and on the documents already in the
AI Index, so renaming one means updating the serverless authorization expectations and waiting for the next crawl
to re-index.
