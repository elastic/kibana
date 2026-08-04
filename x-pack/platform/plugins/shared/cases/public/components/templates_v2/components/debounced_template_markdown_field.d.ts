import React from 'react';
import type { ReactNode } from 'react';
interface DebouncedTemplateMarkdownFieldProps {
    label: ReactNode;
    ariaLabel: string;
    /** Source-of-truth value; the field re-syncs when it changes from outside (YAML edit, load). */
    value: string;
    /** Debounced — fired after the user pauses; also flushed on blur. */
    onChange: (value: string) => void;
    editorId: string;
    dataTestSubj: string;
}
/**
 * A markdown editor whose keystrokes stay local to this component and only propagate (debounced) to
 * the parent on pause / blur — mirroring DebouncedTemplateTextField. Isolating the field this way
 * keeps typing instant even when the surrounding form is heavy (async comboboxes, YAML
 * re-serialization on change).
 */
export declare const DebouncedTemplateMarkdownField: React.FC<DebouncedTemplateMarkdownFieldProps>;
export {};
