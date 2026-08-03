import type { ApplicationStart } from '@kbn/core/public';
import type { VisualizeEditorContext } from '@kbn/lens-common';
export declare const convertToLensActionFactory: (id: string, displayName: string, originatingApp: string) => (application: ApplicationStart) => import("@kbn/ui-actions-plugin/public").Action<{
    [key: string]: VisualizeEditorContext;
}, object>;
