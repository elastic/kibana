import React from 'react';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { PluginsStart } from '../../plugin';
import type { SpacesManager } from '../../spaces_manager';
import type { SolutionViewSwitchCalloutProps } from '../types';
export interface GetSolutionViewSwitchCalloutOptions {
    spacesManager: SpacesManager;
    getStartServices: StartServicesAccessor<PluginsStart>;
}
export declare const getSolutionViewSwitchCalloutComponent: ({ spacesManager, getStartServices, }: GetSolutionViewSwitchCalloutOptions) => Promise<React.FC<SolutionViewSwitchCalloutProps>>;
