import type { SolutionView } from '../../common';
export interface SolutionViewSwitchCalloutInternalProps {
    manageSpacesUrl: string;
    updateSpace: (solution: SupportedSolutionView) => Promise<void>;
    showError: (error: unknown) => void;
    onDismiss: () => void;
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
    manageSpacesUrl: string;
}
