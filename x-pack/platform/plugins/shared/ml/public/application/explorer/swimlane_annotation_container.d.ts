import type { FC } from 'react';
import type { AnnotationsTable } from '@kbn/ml-common-types/annotations';
import type { ChartTooltipService } from '../components/chart_tooltip';
interface SwimlaneAnnotationContainerProps {
    chartWidth: number;
    domain: {
        min: number;
        max: number;
    };
    annotationsData?: AnnotationsTable['annotationsData'];
    tooltipService: ChartTooltipService;
}
export declare const SwimlaneAnnotationContainer: FC<SwimlaneAnnotationContainerProps>;
export {};
