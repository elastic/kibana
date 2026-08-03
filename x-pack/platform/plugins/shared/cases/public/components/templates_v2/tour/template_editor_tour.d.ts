import React from 'react';
interface Props {
    /**
     * Gate the tour until the editor has finished loading. Starting before layout settles lets the
     * first step's popover disrupt the editor layout (e.g. pinning the validation-errors bar to the
     * top), so callers pass `false` while the page is still loading.
     */
    enabled?: boolean;
}
/**
 * Auto-firing guided tour for the template editor (create/edit). Runs once per browser the first
 * time the editor is opened, then persists a "seen" flag. Respects the global `hideAnnouncements`
 * opt-out.
 */
export declare const TemplateEditorTour: React.FC<Props>;
export {};
