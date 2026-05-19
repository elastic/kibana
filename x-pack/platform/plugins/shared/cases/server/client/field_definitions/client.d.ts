import type { SavedObject } from '@kbn/core/server';
import type { CreateFieldDefinitionInput, FieldDefinition, UpdateFieldDefinitionInput } from '../../../common/types/domain/field_definition/latest';
import type { FieldDefinitionsFindRequest, FieldDefinitionsFindResponse } from '../../../common/types/api/field_definition/v1';
import type { CasesClientArgs } from '../types';
/**
 * API for interacting with field definitions (the reusable fields library).
 */
export interface FieldDefinitionsSubClient {
    getFieldDefinitions(params: FieldDefinitionsFindRequest): Promise<FieldDefinitionsFindResponse>;
    getFieldDefinition(id: string): Promise<SavedObject<FieldDefinition>>;
    createFieldDefinition(input: CreateFieldDefinitionInput): Promise<SavedObject<FieldDefinition>>;
    updateFieldDefinition(id: string, input: UpdateFieldDefinitionInput): Promise<SavedObject<FieldDefinition>>;
    deleteFieldDefinition(id: string): Promise<void>;
}
/**
 * Creates the interface for field definitions.
 *
 * @ignore
 */
export declare const createFieldDefinitionsSubClient: (clientArgs: CasesClientArgs) => FieldDefinitionsSubClient;
