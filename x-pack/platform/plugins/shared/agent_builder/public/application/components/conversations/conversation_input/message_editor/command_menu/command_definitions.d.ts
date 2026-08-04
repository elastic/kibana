import type { CommandDefinition } from './types';
export declare const sortedCommandDefinitions: CommandDefinition[];
export declare const getCommandDefinition: (commandId: string) => CommandDefinition | undefined;
export declare const getCommandDefinitionByScheme: (scheme: string) => CommandDefinition | undefined;
/**
 * Returns the list of command definitions available based on feature flags.
 * The `/` skill command is always available (GA).
 * The `@` SML command lives inside Agent Builder, so it requires only the
 * Agent Builder experimental flag.
 */
export declare const useAvailableCommandDefinitions: () => readonly CommandDefinition[];
