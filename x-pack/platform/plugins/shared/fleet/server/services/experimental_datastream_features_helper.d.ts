import type { MappingProperty, PropertyName } from '@elastic/elasticsearch/lib/api/types';
import type { ExperimentalDataStreamFeature } from '../../common/types';
export declare const forEachMappings: (mappingProperties: Record<PropertyName, MappingProperty>, process: (prop: MappingProperty, name: string) => void) => void;
export declare const applyDocOnlyValueToMapping: (mappingProp: MappingProperty, name: string, featureMap: ExperimentalDataStreamFeature, isDocValueOnlyNumericChanged: boolean, isDocValueOnlyOtherChanged: boolean) => void;
