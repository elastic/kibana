import React from 'react';
interface WorkflowDestinationLinkProps {
    id: string;
    /** When provided, renders immediately without fetching. */
    name?: string;
    isDraft?: boolean;
    /** Controls whether the DI-based fetch is enabled (only relevant when `name` is omitted). */
    isEnabled?: boolean;
}
/**
 * Renders a workflow destination as a clickable link or a "Draft" badge.
 * Requires DI context — gets `application` via `useService`.
 * When `name` is omitted, fetches the workflow name via `useFetchWorkflow`.
 */
export declare const WorkflowDestinationLink: ({ id, name, isDraft, isEnabled, }: WorkflowDestinationLinkProps) => React.JSX.Element;
export {};
