import type { FieldDefinition, UpdateFieldDefinitionInput } from '../../../../common/types/domain/field_definition/v1';
import type { ServerError } from '../../../types';
interface MutationArgs {
    id: string;
    fieldDefinition: UpdateFieldDefinitionInput;
}
interface UseUpdateFieldDefinitionProps {
    onSuccess?: (data: FieldDefinition) => void;
}
export declare const useUpdateFieldDefinition: ({ onSuccess }?: UseUpdateFieldDefinitionProps) => import("@tanstack/react-query").UseMutationResult<{
    fieldDefinitionId: string;
    name: string;
    definition: string;
    owner: string;
    description?: string | undefined;
    isGlobal?: boolean | undefined;
}, ServerError, MutationArgs, unknown>;
export {};
