import React from 'react';
import type { IntegrationCardItem } from '../../home';
export interface PackageGridProps {
    items: IntegrationCardItem[];
    isLoading: boolean;
}
export declare const ResponsivePackageGrid: React.FC<PackageGridProps>;
