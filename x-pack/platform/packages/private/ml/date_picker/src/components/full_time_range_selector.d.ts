import type { FC } from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataView } from '@kbn/data-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { type SetFullTimeRangeApiPath } from '../services/full_time_range_selector_service';
import type { GetTimeFieldRangeResponse } from '../services/types';
import { type FrozenTierPreference } from '../storage';
/**
 * FullTimeRangeSelectorProps React Component props interface
 */
export interface FullTimeRangeSelectorProps {
    /**
     * Frozen data preference ('exclude-frozen' | 'include-frozen')
     */
    frozenDataPreference: FrozenTierPreference;
    /**
     * Callback to set frozen data preference.
     * @param value - The updated frozen data preference.
     */
    setFrozenDataPreference: (value: FrozenTierPreference | undefined) => void;
    /**
     * timefilter service.
     */
    timefilter: TimefilterContract;
    /**
     * Current data view.
     */
    dataView: DataView;
    /**
     * Boolean flag to enable/disable the full time range button.
     */
    disabled: boolean;
    /**
     * Optional DSL query.
     */
    query?: QueryDslQueryContainer;
    /**
     * Optional callback.
     * @param value - The time field range response.
     */
    callback?: (value: GetTimeFieldRangeResponse) => void;
    /**
     * Optional API path.
     * @param value - The time field range response.
     */
    apiPath?: SetFullTimeRangeApiPath;
}
/**
 * Component for rendering a button which automatically sets the range of the time filter
 * to the time range of data in the index(es) mapped to the supplied Kibana data view or query.
 *
 * @type {FC<FullTimeRangeSelectorProps>}
 * @param props - `FullTimeRangeSelectorProps` component props
 * @returns {React.ReactElement} The FullTimeRangeSelector component.
 */
export declare const FullTimeRangeSelector: FC<FullTimeRangeSelectorProps>;
