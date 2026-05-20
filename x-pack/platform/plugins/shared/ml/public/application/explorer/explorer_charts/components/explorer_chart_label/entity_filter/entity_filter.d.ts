import type { FC } from 'react';
import type { MlEntityFieldOperation } from '@kbn/ml-anomaly-utils';
interface EntityFilterProps {
    onFilter: (params: {
        influencerFieldName: string;
        influencerFieldValue: string;
        action: MlEntityFieldOperation;
    }) => void;
    influencerFieldName: string;
    influencerFieldValue: string;
    isEmbeddable?: boolean;
}
export declare const EntityFilter: FC<EntityFilterProps>;
export {};
