import type { Node } from 'unist';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
export type MutableNode = Node & {
    value?: string;
    toolResultId?: string;
    chartType?: string;
    attachmentId?: string;
    attachmentVersion?: string;
};
export declare const createTagParser: <T extends Record<string, string | undefined>>(config: {
    tagName: string;
    getAttributes: (value: string, extractAttr: (value: string, attr: string) => string | undefined) => T;
    assignAttributes: (node: MutableNode, attributes: T) => void;
    createNode: (attributes: T, position: MutableNode["position"]) => MutableNode;
}) => () => (tree: Node) => void;
export declare const findToolResult: <T>(steps: ConversationRoundStep[], toolResultId: string, resultType: ToolResultType) => T | undefined;
