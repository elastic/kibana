import React from 'react';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import type { useTimefilter } from '../../hooks/use_timefilter';
export declare function DocumentsColumn({ indexPattern, histogramQueryFetch, timeState, numDataPoints, }: {
    indexPattern: string;
    histogramQueryFetch: Promise<UnparsedEsqlResponse>;
    timeState: ReturnType<typeof useTimefilter>['timeState'];
    numDataPoints: number;
}): React.JSX.Element;
