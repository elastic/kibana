import type { AnswerAgentAction, ResearchAgentAction } from './actions';
export declare const StateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    cycleLimit: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    resumeToStep: import("@langchain/langgraph").LastValue<string>;
    currentCycle: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    errorCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    mainActions: import("@langchain/langgraph").BinaryOperatorAggregate<ResearchAgentAction[], ResearchAgentAction[]>;
    answerActions: import("@langchain/langgraph").BinaryOperatorAggregate<AnswerAgentAction[], AnswerAgentAction[]>;
    interrupted: import("@langchain/langgraph").LastValue<boolean>;
    prompt: import("@langchain/langgraph").LastValue<import("@kbn/agent-builder-common/agents/prompts").ConfirmationPrompt>;
    finalAnswer: import("@langchain/langgraph").LastValue<string>;
}>;
export type StateType = typeof StateAnnotation.State;
