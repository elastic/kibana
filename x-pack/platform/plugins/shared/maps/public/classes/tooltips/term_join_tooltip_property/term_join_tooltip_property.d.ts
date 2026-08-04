import type { ReactNode } from 'react';
import type { Filter } from '@kbn/es-query';
import type { ITooltipProperty } from '../tooltip_property';
import type { ITermJoinSource } from '../../sources/join_sources';
export declare class TermJoinTooltipProperty implements ITooltipProperty {
    private readonly _tooltipProperty;
    private readonly _termJoins;
    constructor(tooltipProperty: ITooltipProperty, termJoins: ITermJoinSource[]);
    isFilterable(): boolean;
    getPropertyKey(): string;
    getPropertyName(): ReactNode;
    getRawValue(): string | string[] | undefined;
    getHtmlDisplayValue(): ReactNode;
    getESFilters(): Promise<Filter[]>;
}
