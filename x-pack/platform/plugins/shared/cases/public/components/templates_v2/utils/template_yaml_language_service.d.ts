import { type MonacoYaml, type MonacoYamlOptions } from 'monaco-yaml';
/**
 * Service to manage the global monaco-yaml instance for template YAML editing.
 * monaco-yaml only supports a single global instance, so we manage it as a singleton.
 * Based on workflows' yaml_language_service.ts
 */
export declare const templateYamlLanguageService: {
    /**
     * Initialize the monaco-yaml instance with the given schemas and options.
     * If already initialized, returns the existing instance.
     */
    initialize(schemas?: MonacoYamlOptions["schemas"], options?: Partial<MonacoYamlOptions>): Promise<MonacoYaml>;
    /**
     * Update the monaco-yaml instance with new schemas and options.
     * If not initialized, initializes it first.
     */
    update(schemas?: MonacoYamlOptions["schemas"], options?: Partial<MonacoYamlOptions>): Promise<void>;
    /**
     * Clear schemas from the monaco-yaml instance.
     * Keeps the instance alive but removes all schemas.
     */
    clearSchemas(): Promise<void>;
    /**
     * Dispose of the monaco-yaml instance completely.
     * Should only be called when no TemplateYamlEditor components are mounted.
     */
    dispose(): void;
    /**
     * Get the current monaco-yaml instance.
     * Returns null if not initialized.
     */
    getInstance(): MonacoYaml | null;
    /**
     * Check if the service is initialized.
     */
    isInitialized(): boolean;
};
