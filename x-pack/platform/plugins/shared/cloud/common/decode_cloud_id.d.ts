import type { Logger } from '@kbn/logging';
export interface DecodedCloudId {
    host: string;
    defaultPort: string;
    elasticsearchUrl: string;
    kibanaUrl: string;
}
export declare function decodeCloudId(cid: string, logger: Logger): DecodedCloudId | undefined;
