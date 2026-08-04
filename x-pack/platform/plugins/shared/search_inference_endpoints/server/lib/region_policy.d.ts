import type { ElasticsearchClient } from '@kbn/core/server';
import type { RegionPolicyBody, RegionPolicyResponse } from '../../common/types';
export declare const getRegionPolicy: (client: ElasticsearchClient) => Promise<RegionPolicyResponse>;
export declare const putRegionPolicy: (client: ElasticsearchClient, body: RegionPolicyBody) => Promise<RegionPolicyResponse>;
export declare const deleteRegionPolicy: (client: ElasticsearchClient) => Promise<void>;
