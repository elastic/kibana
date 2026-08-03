import type { ChangeEvent, FocusEvent, KeyboardEvent, SyntheticEvent } from 'react';
import type { ExpressionSuggestion, SuggestionsProvider } from './types';
export interface UseSuggestionsInputParams {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly provider: SuggestionsProvider;
    /** Id of the listbox rendered by `SuggestionsDropdown`; must be unique per input on the page. */
    readonly listId: string;
}
export interface UseSuggestionsInputInputProps {
    readonly value: string;
    readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    readonly onFocus: (event: FocusEvent<HTMLInputElement>) => void;
    readonly onBlur: () => void;
    readonly onSelect: (event: SyntheticEvent<HTMLInputElement>) => void;
    readonly inputRef: (node: HTMLInputElement | null) => void;
    readonly role: 'combobox';
    readonly 'aria-autocomplete': 'list';
    readonly 'aria-expanded': boolean;
    readonly 'aria-controls': string;
    readonly 'aria-activedescendant': string | undefined;
}
export interface UseSuggestionsInputDropdownProps {
    readonly isOpen: boolean;
    readonly closePopover: () => void;
    readonly suggestions: readonly ExpressionSuggestion[];
    readonly activeIndex: number | null;
    readonly onSelect: (suggestion: ExpressionSuggestion) => void;
    readonly onMouseEnterIndex: (index: number) => void;
    readonly listId: string;
}
export interface UseSuggestionsInputResult {
    readonly inputProps: UseSuggestionsInputInputProps;
    readonly dropdownProps: UseSuggestionsInputDropdownProps;
}
/**
 * Wires a `SuggestionsProvider` to a text input: computes suggestions as the user types, moves
 * the cursor, or focuses the field; handles arrow/Enter/Escape keyboard navigation; and applies
 * a selected suggestion at the right position, restoring the cursor afterwards.
 *
 * Returns props to spread onto the input and onto `SuggestionsDropdown` (which owns rendering).
 */
export declare const useSuggestionsInput: ({ value, onChange, provider, listId, }: UseSuggestionsInputParams) => UseSuggestionsInputResult;
