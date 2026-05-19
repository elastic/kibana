import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Owner } from '../../../common/constants/types';
export declare function getActivityDestinationIndexName(spaceId: string, owner: Owner): string;
export declare function getActivityDestinationIndexAlias(spaceId: string, owner: Owner): string;
export declare const CAI_ACTIVITY_INDEX_VERSION = 1;
export declare const CAI_ACTIVITY_SYNC_TYPE = "cai_activity_sync";
export declare const getActivitySourceQuery: (spaceId: string, owner: Owner) => {
    bool: {
        filter: ({
            term: {
                type: string;
                namespaces?: undefined;
                'cases-user-actions.owner'?: undefined;
            };
        } | {
            term: {
                namespaces: string;
                type?: undefined;
                'cases-user-actions.owner'?: undefined;
            };
        } | {
            term: {
                'cases-user-actions.owner': "cases" | "observability" | "securitySolution";
                type?: undefined;
                namespaces?: undefined;
            };
        })[];
        must: {
            bool: {
                should: {
                    term: {
                        'cases-user-actions.type': string;
                    };
                }[];
                minimum_should_match: number;
            };
        }[];
    };
};
export declare const CAI_ACTIVITY_SOURCE_INDEX = ".kibana_alerting_cases";
export declare const getCAIActivityBackfillTaskId: (spaceId: string, owner: Owner) => string;
export declare const getActivitySynchronizationSourceQuery: (lastSyncAt: Date, spaceId: string, owner: Owner) => QueryDslQueryContainer;
