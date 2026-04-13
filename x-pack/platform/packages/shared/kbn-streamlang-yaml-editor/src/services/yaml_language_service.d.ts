import { type MonacoYaml, type MonacoYamlOptions } from 'monaco-yaml';
/**
 * Service to manage the global monaco-yaml instance for Streamlang.
 * monaco-yaml only supports a single global instance, so we manage it as a singleton.
 * Uses reference counting to support multiple editors on the same page.
 * See: https://github.com/remcohaszing/monaco-yaml#usage
 * NOTE: Both the Streamlang and Workflows editors use this apporach. If we ever require both editors to work
 * on the same page simultaneously, this service should be refactored. This would involve hoisting schema awareness
 * for both editors all the way up to the kbn-monaco package, so they're registered in a single configuration call.
 */
export declare const yamlLanguageService: {
    /**
     * Initialize the monaco-yaml instance with the given schemas and options.
     * If already initialized, returns the existing instance.
     */
    initialize(schemas?: MonacoYamlOptions["schemas"], options?: Partial<MonacoYamlOptions>): Promise<MonacoYaml>;
    /**
     * Register an editor and update schemas.
     * Increments the reference count and updates the monaco-yaml instance.
     * Call `release()` when the editor unmounts.
     */
    register(schemas?: MonacoYamlOptions["schemas"], options?: Partial<MonacoYamlOptions>): Promise<void>;
    /**
     * Release an editor registration.
     * Decrements the reference count and clears schemas only when the last editor unmounts.
     * This allows multiple editors to share the same schemas on the same page.
     */
    release(): Promise<void>;
    /**
     * Update the monaco-yaml instance with new schemas and options.
     * If not initialized, initializes it first.
     * Note: Prefer using `register()` and `release()` for proper reference counting.
     */
    update(schemas?: MonacoYamlOptions["schemas"], options?: Partial<MonacoYamlOptions>): Promise<void>;
    /**
     * Clear schemas from the monaco-yaml instance.
     * Keeps the instance alive but removes all schemas.
     */
    clearSchemas(): Promise<void>;
    /**
     * Dispose of the monaco-yaml instance completely.
     * Should only be called when no YamlEditor components are mounted.
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
    /**
     * Get the current reference count (for debugging/testing).
     */
    getRefCount(): number;
};
