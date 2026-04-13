import React from 'react';
import { type PopoverAnchorPosition } from '@elastic/eui';
import { ILM_PHASE_ORDER } from '../edit_ilm_phases_flyout/constants';
export type IlmPhaseSelectOption = (typeof ILM_PHASE_ORDER)[number];
export interface IlmPhaseSelectRenderButtonProps {
    disabled: boolean;
    onClick: React.MouseEventHandler;
    'data-test-subj': string;
    'aria-label': string;
}
export interface IlmPhaseSelectProps {
    renderButton: (props: IlmPhaseSelectRenderButtonProps) => React.ReactElement;
    selectedPhases: IlmPhaseSelectOption[];
    onSelect: (phase: IlmPhaseSelectOption) => void;
    excludedPhases?: IlmPhaseSelectOption[];
    disabled?: boolean;
    initialIsOpen?: boolean;
    anchorPosition?: PopoverAnchorPosition;
    'data-test-subj'?: string;
}
export declare const IlmPhaseSelect: ({ renderButton, selectedPhases, onSelect, excludedPhases, disabled, initialIsOpen, anchorPosition, "data-test-subj": dataTestSubj, }: IlmPhaseSelectProps) => React.JSX.Element;
