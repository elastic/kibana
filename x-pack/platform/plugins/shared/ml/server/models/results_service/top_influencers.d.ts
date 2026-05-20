import type { GetTopInfluencersRequest as GetTopInfluencersParams, InfluencersByFieldResponse } from '@kbn/ml-common-types/results';
import type { MlClient } from '../../lib/ml_client';
export declare function getTopInfluencers(mlClient: MlClient, { jobIds, earliestMs, latestMs, influencers, influencersFilterQuery, maxFieldValues, perPage, page, }: GetTopInfluencersParams): Promise<InfluencersByFieldResponse>;
