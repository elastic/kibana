import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import React from 'react';
import type { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
interface LinkFilter {
    filter: QueryDslQueryContainer;
    meta?: {
        name?: string;
    };
}
export interface DiscoverLinkProps {
    documentFilters?: LinkFilter[];
    logsSource: ResolvedIndexNameLogsSourceConfiguration;
    timeRange: {
        start: string;
        end: string;
    };
    dependencies: DiscoverLinkDependencies;
}
export interface DiscoverLinkDependencies {
    share: SharePluginStart;
}
export declare const DiscoverLink: React.MemoExoticComponent<({ dependencies: { share }, documentFilters, logsSource, timeRange }: DiscoverLinkProps) => React.JSX.Element>;
export declare const discoverLinkTitle: string;
export declare const contextualLogsFilterLabel: string;
export {};
