import type { ServerError } from '../../../types';
interface MutationArgs {
    id: string;
}
interface UseDeleteFieldDefinitionProps {
    onSuccess?: () => void;
}
export declare const useDeleteFieldDefinition: ({ onSuccess }?: UseDeleteFieldDefinitionProps) => import("@kbn/react-query").UseMutationResult<void, ServerError, MutationArgs, unknown>;
export {};
