import type { ReactNode } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import { ESTooltipProperty } from './es_tooltip_property';
import { AGG_TYPE } from '../../../common/constants';
import type { ITooltipProperty } from './tooltip_property';
import type { IESAggField } from '../fields/agg';
export declare class ESAggTooltipProperty extends ESTooltipProperty {
    private readonly _aggType;
    private readonly _aggField;
    constructor(tooltipProperty: ITooltipProperty, indexPattern: DataView, field: IESAggField, aggType: AGG_TYPE, applyGlobalQuery: boolean);
    getHtmlDisplayValue(): ReactNode;
    isFilterable(): boolean;
}
