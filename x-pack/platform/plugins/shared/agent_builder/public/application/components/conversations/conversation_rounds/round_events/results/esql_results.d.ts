import React from 'react';
import type { EsqlResults as EsqlResultsData } from '@kbn/agent-builder-common/tools/tool_result';
interface EsqlResultsProps {
    result: EsqlResultsData;
}
export declare const EsqlResults: React.FC<EsqlResultsProps>;
export {};
