import type { ApplicationStart } from '@kbn/core/public';
import type { VisualizeEditorContext } from '@kbn/lens-common';
export declare const visualizeTSVBAction: (application: ApplicationStart) => import("@kbn/ui-actions-plugin/public").Action<{
    [key: string]: VisualizeEditorContext;
}, object>;
