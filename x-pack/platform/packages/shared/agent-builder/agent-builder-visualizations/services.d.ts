import type { ApplicationStart } from '@kbn/core-application-browser';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
/**
 * Services required to render Agent Builder visualizations. Passed explicitly by
 * consumers so the package stays decoupled from any single plugin's Kibana
 * context shape. `embeddable` powers the Vega renderer (a by-value visualize
 * embeddable with "save to dashboard"); the Lens renderers ignore it.
 */
export interface VisualizationServices {
    application: ApplicationStart;
    lens: LensPublicStart;
    dataViews: DataViewsServicePublic;
    uiActions: UiActionsStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    embeddable: EmbeddableStart;
}
