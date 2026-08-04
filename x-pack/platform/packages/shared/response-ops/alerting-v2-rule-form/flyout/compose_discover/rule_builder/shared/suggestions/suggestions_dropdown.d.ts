import React from 'react';
import type { ReactElement } from 'react';
import type { ExpressionSuggestion } from './types';
export interface SuggestionsDropdownProps {
    /** The field the popover is anchored to; rendered as-is by `EuiInputPopover`. */
    readonly input: ReactElement;
    readonly isOpen: boolean;
    readonly closePopover: () => void;
    readonly suggestions: readonly ExpressionSuggestion[];
    readonly activeIndex: number | null;
    readonly onSelect: (suggestion: ExpressionSuggestion) => void;
    readonly onMouseEnterIndex: (index: number) => void;
    /** Id of the listbox, referenced by the input's `aria-controls`/`aria-activedescendant`. */
    readonly listId: string;
    /** Prefix used to build a stable `data-test-subj` per option. */
    readonly testSubjPrefix: string;
}
export declare const SuggestionsDropdown: React.FC<SuggestionsDropdownProps>;
