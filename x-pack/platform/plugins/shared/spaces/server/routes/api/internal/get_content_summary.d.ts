import type { InternalRouteDeps } from '.';
interface SpaceContentTypeMetaInfo {
    displayName: string;
    icon?: string;
}
export interface SpaceContentTypeSummaryItem extends SpaceContentTypeMetaInfo {
    count: number;
    type: string;
}
export declare function initGetSpaceContentSummaryApi(deps: InternalRouteDeps): void;
export {};
