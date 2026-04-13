import type { BrowserUrlService } from '@kbn/share-plugin/public';
import React from 'react';
import type { TimeRangeConfig } from '../../../../common/types';
export declare const DatasetQualityDetailsLink: React.MemoExoticComponent<({ urlService, dataStream, timeRange, children, }: {
    urlService: BrowserUrlService;
    dataStream: string;
    timeRange: TimeRangeConfig;
    children: React.ReactNode;
}) => React.JSX.Element>;
