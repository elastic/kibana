import type { StartServicesAccessor } from '@kbn/core/public';
import type { SolutionView } from '../../common';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';
export interface SolutionViewSwitchCalloutInternalProps {
    spacesManager: SpacesManager;
    getStartServices: StartServicesAccessor<PluginsStart>;
}
export interface SolutionViewSwitchCalloutProps {
    currentSolution: SupportedSolutionView;
}
export type SupportedSolutionView = Extract<SolutionView, 'es' | 'oblt' | 'security'>;
export interface SolutionViewSwitchModalProps {
    onClose: () => void;
    onSwitch: (solution: SupportedSolutionView) => void;
    currentSolution: SupportedSolutionView;
    isLoading: boolean;
}
