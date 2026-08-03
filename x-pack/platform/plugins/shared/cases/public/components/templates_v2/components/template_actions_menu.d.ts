import React from 'react';
import { monaco } from '@kbn/monaco';
interface TemplateActionsMenuProps {
    editor: monaco.editor.IStandaloneCodeEditor | null;
    value: string;
    onChange: (value: string) => void;
    /** Owner used to scope the field-library list. Unused in `fieldDefinition` mode. */
    owner?: string;
    /**
     * Which document shape the menu is editing:
     *  - `template` (default) — the root holds a `fields:` sequence; all four sections are offered and
     *    Validation/Conditional target the field under the cursor.
     *  - `fieldDefinition` — the root IS a single inline field (the field library's definition shape);
     *    only New field (relabeled "Change field type" once a field exists, since picking a type
     *    replaces the whole definition) and Validation are offered, both targeting the root field.
     */
    mode?: 'template' | 'fieldDefinition';
}
/**
 * The template editor's Actions menu: a bottom-right trigger (also opened with {@link SHORTCUT_HINT})
 * that drills into New field / Field library / Validation / Conditional logic. Every action composes
 * the existing pure YAML transforms (snippet scaffolds, `$ref` links, validation/display blocks) and
 * writes the result back through `onChange`, so the menu adds discoverability without a second code
 * path for editing the definition.
 *
 * The cursor position and the field it points at are snapshotted when the menu opens; the panels are
 * built from that snapshot, so Validation / Conditional logic offer exactly the rules valid for the
 * field under the cursor (and are disabled with a hint when the cursor is not on a field).
 */
export declare const TemplateActionsMenu: React.FC<TemplateActionsMenuProps>;
export {};
