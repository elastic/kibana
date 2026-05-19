import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataViewsPublicPluginSetup, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { LensDocument, Datasource, Visualization, EditorFrameSetup, EditorFrameStart } from '@kbn/lens-common';
export interface EditorFrameSetupPlugins {
    data: DataPublicPluginSetup;
    embeddable?: EmbeddableSetup;
    expressions: ExpressionsSetup;
    charts: ChartsPluginSetup;
    usageCollection?: UsageCollectionSetup;
    dataViews: DataViewsPublicPluginSetup;
}
export interface EditorFrameStartPlugins {
    uiActions: UiActionsStart;
    data: DataPublicPluginStart;
    embeddable?: EmbeddableStart;
    expressions: ExpressionsStart;
    charts: ChartsPluginSetup;
    dataViews: DataViewsPublicPluginStart;
    eventAnnotationService: EventAnnotationServiceType;
}
export interface EditorFramePlugins {
    dataViews: DataViewsContract;
    uiSettings: IUiSettingsClient;
    storage: IStorageWrapper;
    timefilter: TimefilterContract;
    nowProvider: DataPublicPluginStart['nowProvider'];
    eventAnnotationService: EventAnnotationServiceType;
    http?: CoreStart['http'];
}
export declare class EditorFrameService {
    private readonly datasources;
    private readonly visualizations;
    loadDatasources: () => Promise<Record<string, Datasource<unknown, unknown, import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery>>>;
    loadVisualizations: () => Promise<Record<string, Visualization<unknown, unknown, unknown>>>;
    /**
     * This method takes a Lens saved object as returned from the persistence helper,
     * initializes datsources and visualization and creates the current expression.
     * This is an asynchronous process.
     * @param doc parsed Lens saved object
     */
    documentToExpression: (doc: LensDocument, services: EditorFramePlugins & {
        forceDSL?: boolean;
    }) => Promise<import("@kbn/lens-common").DocumentToExpressionReturnType>;
    setup(): EditorFrameSetup;
    start(core: CoreStart, plugins: EditorFrameStartPlugins): EditorFrameStart;
}
