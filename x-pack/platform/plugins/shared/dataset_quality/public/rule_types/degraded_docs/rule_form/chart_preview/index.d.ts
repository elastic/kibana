import type { TickFormatter } from '@elastic/charts';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { IUiSettingsClient } from '@kbn/core/public';
import React from 'react';
import type { TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import type { Maybe } from './chart_preview_helper';
interface ChartPreviewProps {
    yTickFormat?: TickFormatter;
    threshold: number[];
    comparator: COMPARATORS;
    uiSettings?: IUiSettingsClient;
    series: Array<{
        name: string;
        data: Array<{
            x: number;
            y: Maybe<number>;
        }>;
    }>;
    timeSize?: number;
    timeUnit?: TimeUnitChar;
    totalGroups: number;
}
export declare function ChartPreview({ yTickFormat, threshold, comparator, uiSettings, series, timeSize, timeUnit, totalGroups, }: ChartPreviewProps): React.JSX.Element;
export {};
