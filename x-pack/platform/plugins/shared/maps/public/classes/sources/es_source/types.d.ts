import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { Query } from '@kbn/data-plugin/common';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { ISource } from '../source';
import { type IVectorSource } from '../vector_source';
import type { DynamicStylePropertyOptions, StyleMetaData } from '../../../../common/descriptor_types';
import type { IVectorStyle } from '../../styles/vector/vector_style';
import type { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
export declare function isESVectorTileSource(source: ISource): boolean;
export declare function isESSource(source: ISource): source is IESSource;
export declare function hasESSourceMethod(source: ISource, methodName: keyof IESSource): source is Pick<IESSource, typeof methodName>;
export interface IESSource extends IVectorSource {
    getId(): string;
    getIndexPattern(): Promise<DataView>;
    getIndexPatternId(): string;
    getGeoFieldName(): string | undefined;
    getProjectRouting?: () => string | undefined;
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
        styleMeta: StyleMetaData;
        warnings: SearchResponseWarning[];
    }>;
}
