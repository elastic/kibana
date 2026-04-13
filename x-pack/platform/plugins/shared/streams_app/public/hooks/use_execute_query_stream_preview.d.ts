/**
 * Hook for executing ES|QL queries to preview query stream results.
 * This hook manages the loading state, error handling, and document storage
 * for query stream previews.
 *
 * @example
 * ```tsx
 * const { executeQuery, isLoading, error, documents } = useExecuteQueryStreamPreview();
 *
 * const handleQueryChange = async (query: string) => {
 *   await executeQuery(query);
 * };
 *
 * return (
 *   <div>
 *     {isLoading && <Spinner />}
 *     {error && <ErrorMessage error={error} />}
 *     {documents && <DocumentsTable documents={documents} />}
 *   </div>
 * );
 * ```
 */
export declare function useExecuteQueryStreamPreview(): {
    executeQuery: (esqlQuery: string) => Promise<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[]>;
    isLoading: boolean;
    error: Error | undefined;
    documents: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[] | undefined;
};
