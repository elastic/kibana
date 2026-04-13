import React from 'react';
import type { StepConfigurationProps } from '../steps_list';
type StepContextMenuProps = Pick<StepConfigurationProps, 'stepRef' | 'stepUnderEdit' | 'isFirstStepInLevel' | 'isLastStepInLevel'>;
export declare const StepContextMenu: React.FC<StepContextMenuProps>;
export {};
