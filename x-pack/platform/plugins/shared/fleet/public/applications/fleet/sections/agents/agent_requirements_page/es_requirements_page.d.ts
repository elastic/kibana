import React from 'react';
import type { GetFleetStatusResponse } from '../../../types';
export declare const RequirementItem: React.FunctionComponent<{
    children: React.ReactNode;
    isMissing: boolean;
}>;
export declare const MissingESRequirementsPage: React.FunctionComponent<{
    missingRequirements: GetFleetStatusResponse['missing_requirements'];
}>;
