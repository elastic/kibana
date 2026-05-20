import { type SetStateAction } from 'react';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { TimeRange } from '@kbn/es-query';
import type { TimefilterContract } from '@kbn/data-plugin/public';
export declare function useEpisodesListUrlState(timefilter: TimefilterContract): {
    filterState: EpisodesFilterState;
    setFilterState: (update: SetStateAction<EpisodesFilterState>) => void;
    timeRange: TimeRange;
    handleTimeChange: (range: TimeRange) => void;
};
