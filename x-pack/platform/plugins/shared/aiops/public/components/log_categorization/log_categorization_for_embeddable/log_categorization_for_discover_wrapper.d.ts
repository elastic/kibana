import type { FC } from 'react';
import { type AiopsAppContextValue } from '../../../hooks/use_aiops_app_context';
import type { LogCategorizationEmbeddableProps } from './log_categorization_for_discover';
export interface LogCategorizationEmbeddableWrapperProps {
    appContextValue: AiopsAppContextValue;
    props: LogCategorizationEmbeddableProps;
}
export declare const LogCategorizationDiscoverWrapper: FC<LogCategorizationEmbeddableWrapperProps>;
export default LogCategorizationDiscoverWrapper;
