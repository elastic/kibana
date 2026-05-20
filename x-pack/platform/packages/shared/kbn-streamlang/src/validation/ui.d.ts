import { type StreamlangDSL } from '../../types/streamlang';
export declare const validateStreamlangModeCompatibility: (dsl: StreamlangDSL) => {
    canBeRepresentedInInteractiveMode: boolean;
    canBeRepresentedInYAMLMode: boolean;
    errors: string[];
};
