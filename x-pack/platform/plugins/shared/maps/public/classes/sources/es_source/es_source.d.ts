import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { ProjectRouting } from '@kbn/es-query';
import type { DataViewField, DataView, ISearchSource } from '@kbn/data-plugin/common';
import type { Query } from '@kbn/data-plugin/common';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import type { TimeRange } from '@kbn/es-query';
import { type SearchResponseWarning } from '@kbn/search-response-warnings';
import type { BoundsRequestMeta } from '../vector_source';
import { AbstractVectorSource } from '../vector_source';
import type { AbstractESSourceDescriptor, DynamicStylePropertyOptions, MapExtent, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import type { IVectorStyle } from '../../styles/vector/vector_style';
import type { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import type { IField } from '../../fields/field';
import type { FieldFormatter } from '../../../../common/constants';
import type { IESSource } from './types';
export declare function isSearchSourceAbortError(error: Error): boolean;
export declare class AbstractESSource extends AbstractVectorSource implements IESSource {
    indexPattern?: DataView;
    readonly _descriptor: AbstractESSourceDescriptor;
    static createDescriptor(descriptor: Partial<AbstractESSourceDescriptor>): AbstractESSourceDescriptor;
    constructor(descriptor: AbstractESSourceDescriptor);
    getId(): string;
    getInspectorRequestIds(): string[];
    getApplyGlobalQuery(): boolean;
    getApplyGlobalTime(): boolean;
    getApplyForceRefresh(): boolean;
    isQueryAware(): boolean;
    cloneDescriptor(): any;
    _runEsQuery({ registerCancelCallback, requestId, requestName, searchSessionId, searchSource, executionContext, requestsAdapter, onWarning, fetchOptions, }: {
        registerCancelCallback: (callback: () => void) => void;
        requestId: string;
        requestName: string;
        searchSessionId?: string;
        searchSource: ISearchSource;
        executionContext: KibanaExecutionContext;
        requestsAdapter: RequestAdapter | undefined;
        onWarning?: (warning: SearchResponseWarning) => void;
        fetchOptions?: {
            projectRouting?: ProjectRouting;
        };
    }): Promise<any>;
    makeSearchSource(requestMeta: VectorSourceRequestMeta | BoundsRequestMeta, limit: number, initialSearchContext?: object): Promise<{
        searchSource: ISearchSource;
        fetchOptions: {
            projectRouting?: ProjectRouting;
        };
    }>;
    getBoundsForFilters(boundsFilters: BoundsRequestMeta, registerCancelCallback: (callback: () => void) => void): Promise<MapExtent | null>;
    isTimeAware(): Promise<boolean>;
    getIndexPatternId(): string;
    getGeoFieldName(): string;
    getIndexPattern(): Promise<DataView>;
    supportsFitToBounds(): Promise<boolean>;
    _getGeoField(): Promise<DataViewField>;
    getDisplayName(): Promise<string>;
    isBoundsAware(): boolean;
    createFieldFormatter(field: IField): Promise<FieldFormatter | null>;
    loadStylePropsMeta({ layerName, style, dynamicStyleProps, registerCancelCallback, sourceQuery, timeFilters, searchSessionId, inspectorAdapters, executionContext, }: {
        layerName: string;
        style: IVectorStyle;
        dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
        registerCancelCallback: (callback: () => void) => void;
        sourceQuery?: Query;
        timeFilters: TimeRange;
        searchSessionId?: string;
        inspectorAdapters: Adapters;
        executionContext: KibanaExecutionContext;
    }): Promise<{
        styleMeta: any;
        warnings: import("@kbn/search-response-warnings/src/types").SearchResponseIncompleteWarning[];
    }>;
    getValueSuggestions: (field: IField, query: string) => Promise<string[]>;
}
