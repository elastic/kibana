import type { CommandDefinition } from './types';
export declare const sortedCommandDefinitions: CommandDefinition[];
export declare const getCommandDefinition: (commandId: string) => CommandDefinition | undefined;
export declare const getCommandDefinitionByScheme: (scheme: string) => CommandDefinition | undefined;
/**
 * Returns the list of command definitions available based on feature flags.
 * The `/` skill command is always available (GA).
 * The `@` SML command requires experimental features to be enabled.
 */
export declare const useAvailableCommandDefinitions: () => readonly CommandDefinition[];
