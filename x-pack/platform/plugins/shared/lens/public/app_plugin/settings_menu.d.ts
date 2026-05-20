import React from 'react';
import type { Store } from 'redux';
import type { LensAppState, LensStartServices as StartServices } from '@kbn/lens-common';
export declare function SettingsMenu({ anchorElement, isOpen, onClose, }: {
    anchorElement: HTMLElement;
    isOpen: boolean;
    onClose: () => void;
}): React.JSX.Element;
/**
 * Toggles the settings menu
 *
 * Note: the code inside this function is covered only at the functional test level
 */
export declare function toggleSettingsMenuOpen(props: {
    lensStore: Store<LensAppState>;
    anchorElement: HTMLElement;
    startServices: StartServices;
}): void;
