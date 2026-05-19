import moment from 'moment';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { FormBasedLayer, FormBasedPrivateState, FramePublicAPI, IndexPattern, UserMessage, DateRange } from '@kbn/lens-common';
export declare function parseTimeShiftWrapper(timeShiftString: string, dateRange: DateRange): moment.Duration | "previous" | "invalid";
export declare const timeShiftOptions: {
    label: string;
    value: string;
}[];
export declare const timeShiftOptionOrder: {
    [key: string]: number;
};
export declare function getDateHistogramInterval(datatableUtilities: DatatableUtilitiesService, layer: FormBasedLayer, indexPattern: IndexPattern, activeData: Record<string, Datatable> | undefined, layerId: string): {
    canShift: boolean;
    hasDateHistogram: boolean;
    interval?: undefined;
    expression?: undefined;
} | {
    interval: moment.Duration | null;
    expression: string;
    canShift: boolean;
    hasDateHistogram: boolean;
};
export declare function getLayerTimeShiftChecks({ interval: dateHistogramInterval, canShift, }: ReturnType<typeof getDateHistogramInterval>): {
    canShift: boolean;
    isValueTooSmall: (parsedValue: ReturnType<typeof parseTimeShiftWrapper>) => boolean | null | undefined;
    isValueNotMultiple: (parsedValue: ReturnType<typeof parseTimeShiftWrapper>) => boolean | null | undefined;
    isInvalid: (parsedValue: ReturnType<typeof parseTimeShiftWrapper>) => boolean;
};
export declare function getStateTimeShiftWarningMessages(datatableUtilities: DatatableUtilitiesService, state: FormBasedPrivateState, { activeData, dataViews }: FramePublicAPI): UserMessage[];
export declare function getColumnTimeShiftWarnings(dateHistogramInterval: ReturnType<typeof getDateHistogramInterval>, timeShift: string | undefined): string[];
export declare function resolveTimeShift(timeShift: string | undefined, dateRange: DateRange, targetBars: number, hasDateHistogram?: boolean): string | undefined;
