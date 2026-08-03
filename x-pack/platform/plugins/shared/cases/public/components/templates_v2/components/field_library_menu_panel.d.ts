import React from 'react';
interface FieldLibraryMenuPanelProps {
    owner?: string;
    /** Current editor YAML — used to mark fields already referenced by the template. */
    existingYaml: string;
    onSelect: (fieldName: string) => void;
    /** Width shared with the parent popover panels so the menu doesn't resize-jump. */
    width: number;
}
/**
 * The Field library branch of the Actions menu: a searchable, single-select list of the space's
 * saved field definitions. Selecting one links it into the template as a `{ $ref }` entry (via the
 * menu's `onSelect`). Fields already referenced by the template are shown as checked + disabled so
 * they cannot be added twice. The library query is shared (same query key) with the editor's `$ref`
 * autocomplete, so opening this panel usually resolves from cache.
 */
export declare const FieldLibraryMenuPanel: React.FC<FieldLibraryMenuPanelProps>;
export {};
