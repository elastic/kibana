import type { CreateFieldDefinitionInput, FieldDefinition, UpdateFieldDefinitionInput } from '../../../../common/types/domain/field_definition/v1';
import type { FieldDefinitionsFindResponse } from '../../../../common/types/api/field_definition/v1';
export declare const getFieldDefinitions: ({ owner, signal, }: {
    owner?: string | string[];
    signal?: AbortSignal;
}) => Promise<FieldDefinitionsFindResponse>;
export declare const postFieldDefinition: ({ fieldDefinition, signal, }: {
    fieldDefinition: CreateFieldDefinitionInput;
    signal?: AbortSignal;
}) => Promise<FieldDefinition>;
export declare const putFieldDefinition: ({ id, fieldDefinition, signal, }: {
    id: string;
    fieldDefinition: UpdateFieldDefinitionInput;
    signal?: AbortSignal;
}) => Promise<FieldDefinition>;
export declare const deleteFieldDefinition: ({ id, signal, }: {
    id: string;
    signal?: AbortSignal;
}) => Promise<void>;
