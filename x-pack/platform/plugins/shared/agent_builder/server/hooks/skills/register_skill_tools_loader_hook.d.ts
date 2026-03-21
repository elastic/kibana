import type { InternalSetupServices } from '../../services';
/**
 * Registers a blocking afterToolCall hook that dynamically loads a skill's
 * tools into the tool manager when the agent reads a skill file.
 */
export declare const registerSkillToolsLoaderHook: (serviceSetups: InternalSetupServices) => void;
