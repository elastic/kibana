import type { SwimlaneFieldsType } from '../../../common/types/domain';
import type { ICasesConnector } from '../types';
export type SwimlaneCaseConnector = ICasesConnector<SwimlaneFieldsType>;
export type Format = ICasesConnector<SwimlaneFieldsType>['format'];
export type GetMapping = ICasesConnector<SwimlaneFieldsType>['getMapping'];
