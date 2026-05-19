import type { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { LensAppLocator, VisualizeEditorContext, LensAppServices, EditorFrameStart, LensTopNavMenuEntryGenerator, LensAttributesService } from '@kbn/lens-common';
import type { LensPluginStartDependencies } from '../plugin';
export declare function getLensServices(coreStart: CoreStart, startDependencies: LensPluginStartDependencies, attributeService: LensAttributesService, initialContext?: VisualizeFieldContext | VisualizeEditorContext, locator?: LensAppLocator): Promise<LensAppServices>;
export declare function mountApp(core: CoreSetup<LensPluginStartDependencies, void>, params: AppMountParameters, mountProps: {
    createEditorFrame: EditorFrameStart['createInstance'];
    attributeService: LensAttributesService;
    topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
    locator?: LensAppLocator;
}): Promise<() => void>;
