import type { ResilientFieldsType } from '../../../common/types/domain';
import type { ICasesConnector } from '../types';
export type ResilientCaseConnector = ICasesConnector<ResilientFieldsType>;
export type Format = ICasesConnector<ResilientFieldsType>['format'];
export type GetMapping = ICasesConnector<ResilientFieldsType>['getMapping'];
