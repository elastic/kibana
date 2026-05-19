import React from 'react';
import type { LensAggFilterValue as FilterValue, IndexPattern } from '@kbn/lens-common';
export declare const FilterPopover: ({ filter, setFilter, indexPattern, button, isOpen, triggerClose, }: {
    filter: FilterValue;
    setFilter: Function;
    indexPattern: IndexPattern;
    button: React.ReactChild;
    isOpen: boolean;
    triggerClose: () => void;
}) => React.JSX.Element;
