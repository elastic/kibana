import type { CreateFieldDefinitionInput, FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import type { ServerError } from '../../../types';
interface MutationArgs {
    fieldDefinition: CreateFieldDefinitionInput;
}
interface UseCreateFieldDefinitionProps {
    onSuccess?: (data: FieldDefinition) => void;
}
export declare const useCreateFieldDefinition: ({ onSuccess }?: UseCreateFieldDefinitionProps) => import("@kbn/react-query").UseMutationResult<{
    fieldDefinitionId: string;
    name: string;
    definition: string;
    owner: string;
    description?: string | undefined;
}, ServerError, MutationArgs, unknown>;
export {};
