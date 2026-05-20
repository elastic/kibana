import type { ReactNode } from 'react';
import { type Filter } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import type { ITooltipProperty } from './tooltip_property';
import type { IField } from '../fields/field';
export declare class ESTooltipProperty implements ITooltipProperty {
    private readonly _tooltipProperty;
    private readonly _indexPattern;
    private readonly _field;
    private readonly _applyGlobalQuery;
    constructor(tooltipProperty: ITooltipProperty, indexPattern: DataView, field: IField, applyGlobalQuery: boolean);
    getPropertyKey(): string;
    getPropertyName(): ReactNode;
    getRawValue(): string | string[] | undefined;
    _getIndexPatternField(): DataViewField | undefined;
    getHtmlDisplayValue(): ReactNode;
    isFilterable(): boolean;
    getESFilters(): Promise<Filter[]>;
}
