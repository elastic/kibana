import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { EnrichmentUrlState } from '../url_schema/enrichment_url_schema';
export type StreamsAppLocatorParams = SerializableRecord & ({
    [key: string]: never;
} | {
    name: string;
} | {
    name: string;
    managementTab: 'processing';
    pageState: EnrichmentUrlState;
} | {
    name: string;
    managementTab: string;
    pageState: never;
});
export type StreamsAppLocator = LocatorPublic<StreamsAppLocatorParams>;
export declare class StreamsAppLocatorDefinition implements LocatorDefinition<StreamsAppLocatorParams> {
    readonly id = "STREAMS_APP_LOCATOR";
    constructor();
    readonly getLocation: (params: StreamsAppLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {};
    }>;
}
