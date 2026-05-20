import type { Logger } from '@kbn/logging';
import type { FleetProxy, Output, TemplateAgentPolicyInput } from '../../types';
import type { FullAgentPolicyInput, OTelCollectorConfig, OTelCollectorPipeline, OTelCollectorPipelineID, PackageInfo } from '../../../common/types';
/**
 * Builds OpenTelemetry Collector fragments merged into the full agent policy.
 *
 * **Dataset and namespace:** Routing transforms use `stream.data_stream` from
 * the merged policy (after `getFullInputStreams`, which applies
 * `data_stream.dataset` / `data_stream.type` stream vars for `otelcol` inputs
 * verbatim). OTTL statements set `data_stream.*` attributes as string literals;
 * Fleet does not append the `.otel` Elasticsearch template suffix here — that
 * suffix is only applied in EPM via `getRegistryDataStreamAssetBaseName(..., isOtelInputType)`.
 *
 * **Package shape:** `hasDynamicSignalTypes` distinguishes OTLP-style packages
 * (`dynamic_signal_types: true`) from receiver-specific integrations; both
 * paths still emit routing transforms from this module, with behaviour covered
 * by API integration tests.
 *
 * @see `dev_docs/data_streams.md` (OpenTelemetry integrations and the `.otel` suffix)
 * @see `x-pack/platform/test/fleet_api_integration/apis/agent_policy/agent_policy_otel_routing.ts`
 */
export declare function generateOtelcolConfig({ inputs, dataOutput, packageInfoCache, proxy, logger, defaultPackageInfo, }: {
    inputs: FullAgentPolicyInput[] | TemplateAgentPolicyInput[];
    dataOutput?: Output;
    packageInfoCache?: Map<string, PackageInfo>;
    proxy?: FleetProxy;
    logger?: Logger;
    defaultPackageInfo?: PackageInfo;
}): OTelCollectorConfig;
export declare function extractSignalTypesFromPipelines(pipelines: Record<OTelCollectorPipelineID, OTelCollectorPipeline>): string[];
export declare function getSignalType(id: string): string;
