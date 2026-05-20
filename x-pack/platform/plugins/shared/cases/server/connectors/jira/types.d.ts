import type { JiraFieldsType } from '../../../common/types/domain';
import type { ICasesConnector } from '../types';
interface ExternalServiceFormatterParams extends JiraFieldsType {
    labels: string[];
}
export type JiraCaseConnector = ICasesConnector<ExternalServiceFormatterParams>;
export type Format = ICasesConnector<ExternalServiceFormatterParams>['format'];
export type GetMapping = ICasesConnector<ExternalServiceFormatterParams>['getMapping'];
export {};
