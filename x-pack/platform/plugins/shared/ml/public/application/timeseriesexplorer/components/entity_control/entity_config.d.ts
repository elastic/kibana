import type { FC } from 'react';
import type { MlEntityFieldType } from '@kbn/ml-anomaly-utils';
import type { Entity } from './entity_control';
import type { UiPartitionFieldConfig } from '../series_controls/series_controls';
interface EntityConfigProps {
    entity: Entity;
    isModelPlotEnabled: boolean;
    config: UiPartitionFieldConfig;
    onConfigChange: (fieldType: MlEntityFieldType, config: Partial<UiPartitionFieldConfig>) => void;
}
export declare const EntityConfig: FC<EntityConfigProps>;
export {};
