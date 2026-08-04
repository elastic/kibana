import type { ScopedHistory } from '@kbn/core/public';
import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
export declare const unsavedChangesWarning: string;
export declare const unsavedChangesTitle: string;
export declare function getBreadcrumbs({ pageTitle, isByValue, getHasUnsavedChanges, originatingApp, incomingBreadcrumbs, getAppNameFromId, history, }: {
    pageTitle: string;
    isByValue: boolean;
    getHasUnsavedChanges: () => boolean;
    originatingApp?: string;
    incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[];
    getAppNameFromId?: (id: string) => string | undefined;
    history: ScopedHistory;
}): (EmbeddableEditorBreadcrumb | {
    onClick: () => void;
    text: string;
} | {
    text: string;
    onClick?: undefined;
})[];
