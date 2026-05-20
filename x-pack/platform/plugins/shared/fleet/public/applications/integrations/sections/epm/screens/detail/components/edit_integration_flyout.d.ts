import React from 'react';
import type { FleetStartServices } from '../../../../../../../plugin';
import type { PackageInfo, PackageSpecCategory } from '../../../../../types';
export declare const EditIntegrationFlyout: React.FunctionComponent<{
    onClose: () => void;
    integrationName: string;
    miniIcon: React.ReactNode;
    packageInfo: PackageInfo | null;
    setIsEditOpen: (isOpen: boolean) => void;
    integration: string | null;
    services: FleetStartServices;
    onComplete: (arg0: {}) => void;
    existingCategories: Array<PackageSpecCategory | undefined>;
}>;
