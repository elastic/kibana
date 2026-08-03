import { type FC } from 'react';
import { type Field } from '@kbn/ml-anomaly-utils';
/**
 * Represents a field used for statistics.
 */
export type FieldForStats = Pick<Field, 'id' | 'type'>;
/**
 * Represents the props for the FieldStatsInfoButton component.
 */
export interface FieldStatsInfoButtonProps {
    /**
     * The field for which to display statistics.
     */
    field: FieldForStats;
    /**
     * The label for the field.
     */
    label: string;
    /**
     * Button click callback function.
     * @param field - The field for which to display statistics.
     * @returns void
     */
    onButtonClick?: (field: FieldForStats) => void;
    /**
     * If true, the button is disabled.
     */
    disabled?: boolean;
    /**
     * If true, the field is empty.
     */
    isEmpty?: boolean;
    /**
     * If true, the trigger is hidden.
     */
    hideTrigger?: boolean;
}
/**
 * Renders a button component for field statistics information.
 *
 * @component
 * @example
 * ```tsx
 * <FieldStatsInfoButton
 *   field={field}
 *   label={label}
 *   onButtonClick={handleButtonClick}
 *   disabled={false}
 *   isEmpty={true}
 *   hideTrigger={false}
 * />
 * ```
 * @param {FieldStatsInfoButtonProps} props - The props for the FieldStatsInfoButton component.
 */
export declare const FieldStatsInfoButton: FC<FieldStatsInfoButtonProps>;
