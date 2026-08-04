import React from 'react';
import type { SearchMatchCounts } from '@kbn/alerting-v2-schemas';
interface Props {
    searchParam?: string;
    data?: {
        searchMatches: SearchMatchCounts | null;
    };
}
export declare const TruncatedCallout: ({ data, searchParam }: Props) => React.JSX.Element | null;
export {};
