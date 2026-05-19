import type { ReactElement } from 'react';
import type { RawValue, VECTOR_STYLES } from '../../../../../common/constants';
export type LegendProps = {
    isPointsOnly: boolean;
    isLinesOnly: boolean;
    symbolId?: string;
    svg?: string;
};
export interface IStyleProperty<T> {
    isDynamic(): boolean;
    isComplete(): boolean;
    formatField(value: RawValue): string | number;
    getStyleName(): VECTOR_STYLES;
    getOptions(): T;
    renderLegendDetailRow(legendProps: LegendProps): ReactElement<any> | null;
    renderDataMappingPopover(onChange: (updatedOptions: Partial<T>) => void): ReactElement<any> | null;
    getDisplayStyleName(): string;
}
export declare class AbstractStyleProperty<T extends object> implements IStyleProperty<T> {
    protected readonly _options: T;
    protected readonly _styleName: VECTOR_STYLES;
    constructor(options: T, styleName: VECTOR_STYLES);
    isDynamic(): boolean;
    /**
     * Is the style fully defined and usable? (e.g. for rendering, in legend UX, ...)
     * Why? during editing, partially-completed descriptors may be added to the layer-descriptor
     * e.g. dynamic-fields can have an incomplete state when the field is not yet selected from the drop-down
     * @returns {boolean}
     */
    isComplete(): boolean;
    formatField(value: RawValue): string | number;
    getStyleName(): VECTOR_STYLES;
    getOptions(): T;
    renderLegendDetailRow({ isPointsOnly, isLinesOnly }: LegendProps): ReactElement<any> | null;
    renderDataMappingPopover(onChange: (updatedOptions: Partial<T>) => void): ReactElement<any> | null;
    getDisplayStyleName(): string;
}
