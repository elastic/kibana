import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
export type AgentBuilderLocatorParams = SerializableRecord;
export declare class AgentBuilderLocatorDefinition implements LocatorDefinition<AgentBuilderLocatorParams> {
    readonly getLocation: () => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
    readonly id = "AGENT_BUILDER_LOCATOR_ID";
}
