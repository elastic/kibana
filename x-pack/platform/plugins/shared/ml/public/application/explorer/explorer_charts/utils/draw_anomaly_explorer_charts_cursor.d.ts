import type { Theme } from '@elastic/charts';
import type { PointerEvent } from '@elastic/charts';
interface ChartScales {
    lineChartXScale: (value: number | null | string) => number;
    margin: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
}
export declare function drawCursor(cursor: Required<PointerEvent>, rootNode: HTMLDivElement, chartId: string, config: {
    plotEarliest: number;
    plotLatest: number;
}, chartScales: ChartScales, chartTheme: Theme): void;
export {};
