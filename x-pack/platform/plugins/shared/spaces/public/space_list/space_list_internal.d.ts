import React from 'react';
import type { SpaceListProps } from './types';
/**
 * Displays a corresponding list of spaces for a given list of saved object namespaces. It shows up to five spaces (and an indicator for any
 * number of spaces that the user is not authorized to see) by default. If more than five named spaces would be displayed, the extras (along
 * with the unauthorized spaces indicator, if present) are hidden behind a button. If '*' (aka "All spaces") is present, it supersedes all
 * of the above and just displays a single badge without a button.
 */
export declare const SpaceListInternal: ({ namespaces, displayLimit, behaviorContext, listOnClick, cursorStyle, }: SpaceListProps) => React.JSX.Element | null;
