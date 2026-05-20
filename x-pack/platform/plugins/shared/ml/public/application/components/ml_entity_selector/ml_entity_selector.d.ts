import type { FC } from 'react';
type EntityType = 'anomaly_detector' | 'data_frame_analytics' | 'trained_models';
type EntitiesSelection = Array<{
    id: string;
    type: EntityType;
}>;
export interface MlEntitySelectorProps {
    entityTypes?: Partial<{
        [key in EntityType]: boolean;
    }>;
    multiSelect?: boolean;
    /**
     * Array of selected ids
     */
    selectedOptions?: Array<{
        id: string;
        type?: EntityType;
    }>;
    onSelectionChange?: (jobSelection: EntitiesSelection) => void;
    /**
     * In case the there are duplicated IDs across different ML entity types,
     * they should be de-selected simultaneously if this setting is enabled.
     */
    handleDuplicates?: boolean;
}
/**
 * Reusable component for picking ML entities.
 *
 * @param entityTypes
 * @param multiSelect
 * @param selectedOptions
 * @param onSelectionChange
 * @param handleDuplicates
 * @constructor
 */
export declare const MlEntitySelector: FC<MlEntitySelectorProps>;
export {};
