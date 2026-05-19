import React from 'react';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { RangeTypeLens } from '@kbn/lens-common';
type LocalRangeType = RangeTypeLens & {
    id: string;
};
export declare const RangePopover: ({ range, setRange, button, triggerClose, isOpen, }: {
    range: LocalRangeType;
    setRange: (newRange: LocalRangeType) => void;
    button: React.ReactChild;
    triggerClose: () => void;
    isOpen: boolean;
}) => React.JSX.Element;
export declare const AdvancedRangeEditor: ({ ranges, setRanges, onToggleEditor, formatter, }: {
    ranges: RangeTypeLens[];
    setRanges: (newRanges: RangeTypeLens[]) => void;
    onToggleEditor: () => void;
    formatter: IFieldFormat;
}) => React.JSX.Element;
export {};
