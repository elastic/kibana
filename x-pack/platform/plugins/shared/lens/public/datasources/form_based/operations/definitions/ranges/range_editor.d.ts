import React from 'react';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { LENS_RANGE_MODES_TYPES } from '@kbn/lens-common';
import type { RangeColumnParams, UpdateParamsFnType } from './ranges';
export declare const RangeEditor: ({ setParam, params, maxHistogramBars, maxBars, granularityStep, onChangeMode, rangeFormatter, }: {
    params: RangeColumnParams;
    maxHistogramBars: number;
    maxBars: number;
    granularityStep: number;
    setParam: UpdateParamsFnType;
    onChangeMode: (mode: LENS_RANGE_MODES_TYPES) => void;
    rangeFormatter: IFieldFormat;
}) => React.JSX.Element;
