# Data Streams

Packages use [data streams](https://www.elastic.co/guide/en/elasticsearch/reference/current/data-streams.html) to ingest data into elasticsearch. These data streams follow the [data stream naming format](https://www.elastic.co/blog/an-introduction-to-the-elastic-data-stream-naming-scheme). Data streams are defined in the package and constructed by Fleet during package install. Mappings are generally derived from `/data_stream/<my_stream>/fields/*.yml` in the package, there is also the ability for packages to set custom mappings or settings directly, e.g APM sets dynamic mapping [here](https://github.com/elastic/package-storage/blob/production/packages/apm/0.4.0/data_stream/app_metrics/manifest.yml#L8) 


## Template Structure

### Index Template 
A data stream is an index template with the data stream flag set to true. Each data stream has one index template. For Fleet data streams the index template should remain as empty as possible, with settings, mappings etc being applied in component templates. Only applying settings and mappings in component templates means we can:
- create more granular index templates in the future (e.g namespace specific) that can use the same component templates (keeping one source of truth)
- allow users to override any setting by using the component template hierarchy (index template settings and mappings cannot be overridden by a component template)

Other details to note about the index template:
- we set priority to 200, this is to beat the generic `logs-*-*`, `metrics-*-*`, `synthetics-*-*` index templates. We advise users set their own index template priority below 100 [here](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html). 
- Fleet index templates are set to managed to deter users from editing them. However it is not necessarily safe to assume that Fleet index templates (or any managed asset) haven't been modified by the user, but if they have been modified we do not have to preserve these changes.

### OpenTelemetry integrations and the `.otel` suffix

OpenTelemetry (`otelcol`) integration packages use two related but different notions of **dataset**:

1. **Registry / package `dataset`** — The value declared on the integration data stream in the package manifest (often short, e.g. `generic`). The Fleet UI and saved package policy streams refer to this registry identity when matching streams to package definitions.

2. **Elasticsearch index naming** — When experimental `enableOtelIntegrations` is on and a data stream uses the `otelcol` input, Fleet appends a **`.otel` segment** only when computing Elasticsearch asset names (index template patterns, etc.). This happens in [`getRegistryDataStreamAssetBaseName`](../common/services/datastream_es_name.ts) via `isOtelInputType`, producing bases such as `traces-generic.otel` (not by requiring `.otel` inside the manifest `dataset` string). The Elastic Agent does not add this suffix to templates; **Kibana EPM** installs templates using that naming at package install time.

3. **`data_stream.dataset` on the collector** — The merged agent policy carries `data_stream.dataset` for each OTel stream. Fleet generates OpenTelemetry Collector config (including OTTL `set(attributes["data_stream.dataset"], "...")` statements) from that value **as-is**; it does **not** append `.otel` there. Optional stream variable `data_stream.dataset` overrides replace the dataset string verbatim for policy output (see [`getFullInputStreams`](../server/services/agent_policies/package_policies_to_agent_inputs.ts)). Further routing defaults may still apply inside the collector or Elasticsearch exporter at runtime (outside Kibana).

**Overrides:** If a user sets `data_stream.dataset` to a custom value (including values that already contain `.otel`), Fleet embeds that literal string in generated OTTL. Fleet does not strip or deduplicate a trailing `.otel`. Installed index templates remain tied to the **registry** dataset plus Fleet’s `.otel` suffix for EPM naming, **not** to the live policy variable—so a custom dataset can target backing indices that only resolve correctly when templates, `dataset_is_prefix`, or exporter routing align with that choice.

**Agent output privileges:** [`storedPackagePoliciesToAgentPermissions`](../server/services/agent_policies/package_policies_to_agent_permissions.ts) builds index names from `compiled_stream?.data_stream?.dataset ?? stream.data_stream.dataset`. It does **not** apply the same `stream.vars['data_stream.dataset']` merge as `getFullInputStreams`. When debugging “permission denied” vs routing, compare full agent policy `data_stream.dataset` with the privilege index patterns.

**Acceptance tests:** Routing transforms and dataset override behaviour for full agent policies are covered in [`agent_policy_otel_routing.ts`](../../../../test/fleet_api_integration/apis/agent_policy/agent_policy_otel_routing.ts) (Fleet API integration tests).

### Component Templates (as of 8.2)
In order of priority from highest to lowest:
  - `.fleet_agent_id_verification-1` - added when agent id verification is enabled, sets the `.fleet_final_pipeline-1` and agent ID mappings. ([we plan to remove the ability to disable agent ID verification](https://github.com/elastic/kibana/issues/127041) )
  - `.fleet_globals-1` - contains fleet global settings and mappings, applied to every data stream
  - `@custom` component template - empty, available as an escape hatch for user to apply custom settings
  - `@package` component template - fleet default settings and mappings plus any settings and mappings defined by the integration.

### `_meta` Fields

All component and index templates have [_meta](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-meta-field.html) fields defined. This allows us to mark them up with:

- package name - the package associated with the data stream
- managed - not editable by the user 
- managed by - managed by the fleet plugin 

example:
```JSON
"_meta" : {
  "package" : {
    "name" : "system"
  },
  "managed_by" : "fleet",
  "managed" : true
},
```

## Making Changes to Template Structure

When making changes to the template structure (e.g [#124013](https://github.com/elastic/kibana/pull/124013)), this will need to be applied to all installed packages on upgrade to retain consistency. On startup we have [a check](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/fleet/server/services/setup.ts#L151) to see if any of the global assets have changed. If they have changed then we attempt to reinstall every package. This will in most cases cause a rollover of all datastreams so shouldn't be treated lightly.


## Pre 8.2 Template Structure

Pre 8.2 the template structure was as follows (in order of precedence): 
  -  index template - All package mappings (moved to @package component template), plus fleet default dynamic mappings (moved to .fleet_globals-1)
  - `.fleet_component_template-1` -  set agent ID verification if enabled (now moved to `.fleet_agent_id_verification-1`)
  - `@custom` component template - empty, available for user to apply custom settings
  - `@settings` component template - any custom settings specified by the package (e.g by specifying `elasticsearch.index_template.settings.some_setting` in manifest.yml )
  - `@mappings` component template - any custom mappings specified by the package (e.g by specifying `elasticsearch.index_template.mappings.some_mapping` in manifest.yml )