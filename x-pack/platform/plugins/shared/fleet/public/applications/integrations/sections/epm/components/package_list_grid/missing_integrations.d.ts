import React from 'react';
import type { ExtendedIntegrationCategory } from '../../screens/home/category_facets';
import type { IntegrationsURLParameters } from '../../screens/home/hooks/use_available_packages';
interface MissingIntegrationContentProps {
    resetQuery: () => void;
    setSelectedCategory: (category: ExtendedIntegrationCategory) => void;
    setUrlandPushHistory: (params: IntegrationsURLParameters) => void;
}
export declare const MissingIntegrationContent: ({ resetQuery, setSelectedCategory, setUrlandPushHistory, }: MissingIntegrationContentProps) => React.JSX.Element;
export {};
