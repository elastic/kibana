import React from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { type VisualizationElementAttributes } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { AgentBuilderStartDependencies } from '../../../../../../types';
export declare const visualizationTagParser: () => (tree: import("unist").Node) => void;
export declare function createVisualizationRenderer({ startDependencies, stepsFromCurrentRound, stepsFromPrevRounds, }: {
    startDependencies: AgentBuilderStartDependencies;
    stepsFromCurrentRound: ConversationRoundStep[];
    stepsFromPrevRounds: ConversationRoundStep[];
}): (props: VisualizationElementAttributes) => React.JSX.Element;
