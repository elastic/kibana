import type { FC, PropsWithChildren } from 'react';
import type { Field, Aggregation, SplitField } from '@kbn/ml-anomaly-utils';
interface DetectorTitleProps {
    index: number;
    agg: Aggregation;
    field: Field;
    byField?: {
        field: SplitField;
        value: string | null;
    };
    deleteDetector?: (dtrIds: number) => void;
}
export declare const DetectorTitle: FC<PropsWithChildren<DetectorTitleProps>>;
export {};
