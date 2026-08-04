import React from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { type VisualizationElementAttributes } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { AgentBuilderStartDependencies } from '../../../../../../types';
export declare const visualizationTagParser: () => (tree: import("unist").Node) => void;
export declare function createVisualizationRenderer({ application, startDependencies, stepsFromCurrentRound, stepsFromPrevRounds, }: {
    application: ApplicationStart;
    startDependencies: AgentBuilderStartDependencies;
    stepsFromCurrentRound: ConversationRoundStep[];
    stepsFromPrevRounds: ConversationRoundStep[];
}): (props: VisualizationElementAttributes) => React.JSX.Element;
