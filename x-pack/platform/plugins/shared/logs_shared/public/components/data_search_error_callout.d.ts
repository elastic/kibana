import React from 'react';
import type { SearchStrategyError } from '../../common/search_strategies/common/errors';
export declare const DataSearchErrorCallout: React.FC<{
    title: React.ReactNode;
    errors: SearchStrategyError[];
    onRetry?: () => void;
}>;
