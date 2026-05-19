import type { CasesColumnSelection } from '../types';
import type { CasesColumnsConfiguration } from '../use_cases_columns_configuration';
export declare const mergeSelectedColumnsWithConfiguration: ({ selectedColumns, casesColumnsConfig, }: {
    selectedColumns: CasesColumnSelection[];
    casesColumnsConfig: CasesColumnsConfiguration;
}) => CasesColumnSelection[];
