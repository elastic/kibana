import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Query } from '@kbn/es-query';
import type { Feature, GeoJsonProperties } from 'geojson';
import type { JoinDescriptor, JoinSourceDescriptor } from '../../../common/descriptor_types';
import type { IVectorSource } from '../sources/vector_source';
import type { IField } from '../fields/field';
import type { PropertiesMap } from '../../../common/elasticsearch_util';
import type { IJoinSource } from '../sources/join_sources';
export declare function createJoinSource(descriptor: Partial<JoinSourceDescriptor> | undefined): IJoinSource | undefined;
export declare class InnerJoin {
    private readonly _descriptor;
    private readonly _rightSource?;
    private readonly _leftField?;
    constructor(joinDescriptor: Partial<JoinDescriptor>, leftSource: IVectorSource);
    hasCompleteConfig(): boolean;
    getJoinFields(): IField[];
    getSourceDataRequestId(): string;
    getSourceMetaDataRequestId(): string;
    getSourceFormattersDataRequestId(): string;
    getLeftField(): IField;
    joinPropertiesToFeature(feature: Feature, propertiesMap: PropertiesMap): boolean;
    getJoinKey(feature: Feature): string | null;
    getRightJoinSource(): IJoinSource;
    toDescriptor(): Partial<JoinDescriptor>;
    getTooltipProperties(properties: GeoJsonProperties, executionContext: KibanaExecutionContext): Promise<import("../..").ITooltipProperty[]>;
    getWhereQuery(): Query | undefined;
}
