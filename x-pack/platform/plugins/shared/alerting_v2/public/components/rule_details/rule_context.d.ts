import React from 'react';
import type { RuleApiResponse } from '../../services/rules_api';
export declare const RuleProvider: ({ rule, children, }: {
    rule: RuleApiResponse;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useRule: () => RuleApiResponse;
