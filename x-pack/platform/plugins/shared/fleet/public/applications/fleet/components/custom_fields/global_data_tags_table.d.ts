import React from 'react';
import type { NewAgentPolicy, AgentPolicy, GlobalDataTag } from '../../../../../common/types';
interface Props {
    updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
    globalDataTags: GlobalDataTag[];
    isDisabled?: boolean;
}
export declare const GlobalDataTagsTable: React.FunctionComponent<Props>;
export {};
