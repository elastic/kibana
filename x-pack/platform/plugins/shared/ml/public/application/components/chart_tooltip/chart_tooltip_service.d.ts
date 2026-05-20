import type { Observable } from 'rxjs';
import type { TooltipValue, TooltipValueFormatter } from '@elastic/charts';
export interface ChartTooltipValue extends TooltipValue {
    skipHeader?: boolean;
}
export interface TooltipHeader {
    skipHeader: boolean;
}
export type TooltipData = ChartTooltipValue[];
export interface ChartTooltipState {
    isTooltipVisible: boolean;
    offset: TooltipOffset;
    tooltipData: TooltipData;
    tooltipHeaderFormatter?: TooltipValueFormatter;
    target: HTMLElement | null;
}
interface TooltipOffset {
    x: number;
    y: number;
}
export declare const getChartTooltipDefaultState: () => ChartTooltipState;
export declare class ChartTooltipService {
    private chartTooltip$;
    tooltipState$: Observable<ChartTooltipState>;
    show(tooltipData: TooltipData, target: HTMLElement, offset?: TooltipOffset): void;
    hide(): void;
}
export {};
