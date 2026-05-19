import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Owner } from '../../../common/constants/types';
export declare function getAttachmentsDestinationIndexName(spaceId: string, owner: Owner): string;
export declare function getAttachmentsDestinationIndexAlias(spaceId: string, owner: Owner): string;
export declare const CAI_ATTACHMENTS_INDEX_VERSION = 1;
export declare const CAI_ATTACHMENTS_SYNC_TYPE = "cai_attachments_sync";
export declare const getAttachmentsSourceQuery: (spaceId: string, owner: Owner) => {
    bool: {
        filter: ({
            term: {
                type: string;
                namespaces?: undefined;
                'cases-comments.owner'?: undefined;
            };
        } | {
            term: {
                namespaces: string;
                type?: undefined;
                'cases-comments.owner'?: undefined;
            };
        } | {
            term: {
                'cases-comments.owner': "cases" | "observability" | "securitySolution";
                type?: undefined;
                namespaces?: undefined;
            };
        })[];
        must: {
            bool: {
                should: {
                    term: {
                        'cases-comments.type': string;
                    };
                }[];
                minimum_should_match: number;
            };
        }[];
    };
};
export declare const CAI_ATTACHMENTS_SOURCE_INDEX = ".kibana_alerting_cases";
export declare const getCAIAttachmentsBackfillTaskId: (spaceId: string, owner: Owner) => string;
export declare const getAttachmentsSynchronizationSourceQuery: (lastSyncAt: Date, spaceId: string, owner: Owner) => QueryDslQueryContainer;
