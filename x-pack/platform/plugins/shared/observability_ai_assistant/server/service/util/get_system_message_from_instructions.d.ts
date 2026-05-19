import type { Instruction } from '../../../common/types';
import type { InstructionOrCallback } from '../types';
export declare const USER_INSTRUCTIONS_HEADER = "## User instructions\n          \nWhat follows is a set of instructions provided by the user, please abide by them\nas long as they don't conflict with anything you've been told so far:\n\n";
export declare function getSystemMessageFromInstructions({ applicationInstructions, kbUserInstructions, apiUserInstructions, availableFunctionNames, }: {
    applicationInstructions: InstructionOrCallback[];
    kbUserInstructions: Instruction[];
    apiUserInstructions: Instruction[];
    availableFunctionNames: string[];
}): string;
