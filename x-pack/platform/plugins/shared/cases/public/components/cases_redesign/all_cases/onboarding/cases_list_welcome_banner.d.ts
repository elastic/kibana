import React from 'react';
interface Props {
    onStartTour: () => void;
    onDismiss: () => void;
}
/**
 * A dismissible "what's new" banner shown at the top of the redesigned cases list. Introduces
 * the redesign and offers a guided tour. Modeled on the Attacks page welcome callout.
 */
export declare const CasesListWelcomeBanner: React.FC<Props>;
export {};
