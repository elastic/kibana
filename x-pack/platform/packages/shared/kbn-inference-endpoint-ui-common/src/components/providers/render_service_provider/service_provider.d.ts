import React from 'react';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import { ServiceProviderKeys } from '../../../constants';
interface ServiceProviderProps {
    providerKey: ServiceProviderKeys;
    searchValue?: string;
}
type SolutionKeys = Partial<{
    [key in SolutionView]: string;
}>;
export declare const solutionKeys: SolutionKeys;
export type ProviderSolution = 'Observability' | 'Security' | 'Search';
interface ServiceProviderRecord {
    icon: string;
    name: string;
    solutions: ProviderSolution[];
}
export declare const SERVICE_PROVIDERS: Record<ServiceProviderKeys, ServiceProviderRecord>;
export declare const ServiceProviderIcon: React.FC<ServiceProviderProps>;
export declare const ServiceProviderName: React.FC<ServiceProviderProps>;
export {};
