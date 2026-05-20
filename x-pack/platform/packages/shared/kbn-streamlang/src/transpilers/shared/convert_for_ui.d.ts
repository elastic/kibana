import type { StreamlangStepWithUIAttributes, StreamlangUIBranch } from '../../../types/ui';
import { type StreamlangDSL, type StreamlangStep } from '../../../types/streamlang';
export declare const convertStepsForUI: (dsl: StreamlangDSL) => StreamlangStepWithUIAttributes[];
export declare const convertStepToUIDefinition: <TStepDefinition extends StreamlangStep>(step: TStepDefinition, options: {
    parentId: StreamlangStepWithUIAttributes["parentId"];
    branch?: StreamlangUIBranch;
}) => StreamlangStepWithUIAttributes;
export declare const convertUIStepsToDSL: (steps: StreamlangStepWithUIAttributes[], stripCustomIdentifiers?: boolean) => StreamlangDSL;
