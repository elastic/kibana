import React from 'react';
interface Props {
    /** When provided, renders a "Start tour" button that launches the templates guided tour. */
    onStartTour?: () => void;
    /** When provided, renders a dismiss button that hides the panel. */
    onDismiss?: () => void;
}
export declare const TemplatesInfoPanel: React.NamedExoticComponent<Props>;
export {};
