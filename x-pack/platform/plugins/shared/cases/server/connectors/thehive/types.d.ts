import type { TheHiveFieldsType } from '../../../common/types/domain';
import type { ICasesConnector } from '../types';
interface ExternalServiceFormatterParams extends TheHiveFieldsType {
    tags: string[];
    severity: number;
}
export type TheHiveCaseConnector = ICasesConnector<ExternalServiceFormatterParams>;
export type Format = ICasesConnector<ExternalServiceFormatterParams>['format'];
export type GetMapping = ICasesConnector<ExternalServiceFormatterParams>['getMapping'];
export {};
