import type { AgentDefinition } from '@kbn/agent-builder-common';
import React from 'react';
interface AgentOptionProps {
    agent?: AgentDefinition;
}
export declare const useAgentOptions: ({ agents, selectedAgentId, }: {
    agents: AgentDefinition[];
    selectedAgentId?: string;
}) => {
    agentOptions: (import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableGroupLabelOption<{
        agent?: AgentDefinition;
    }>, import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableLIOption<{
        agent?: AgentDefinition;
    }>> & import("@elastic/eui").CommonProps & {
        label: string;
        searchableLabel?: string;
        key?: string;
        checked?: import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableOptionCheckedType;
        disabled?: boolean;
        isGroupLabel?: false;
        prepend?: React.ReactNode;
        append?: React.ReactNode;
        ref?: (optionIndex: number) => void;
        id?: never;
        data?: {
            [key: string]: any;
        };
        textWrap?: "truncate" | "wrap";
        truncationProps?: Partial<Omit<import("@elastic/eui").EuiTextTruncateProps, "text" | "children">>;
        toolTipContent?: import("@elastic/eui").EuiToolTipProps["content"];
        toolTipProps?: Partial<Omit<import("@elastic/eui").EuiToolTipProps, "content" | "children">>;
    } & React.HTMLAttributes<HTMLLIElement> & {
        agent?: AgentDefinition;
    })[];
    renderAgentOption: (props: AgentOptionProps) => React.JSX.Element;
};
export {};
