import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { CreateFieldDefinitionInput, FieldDefinition, UpdateFieldDefinitionInput } from '../../../common/types/domain/field_definition/v1';
import type { FieldDefinitionsFindResponse } from '../../../common/types/api/field_definition/v1';
export declare class FieldDefinitionsService {
    private readonly dependencies;
    constructor(dependencies: {
        unsecuredSavedObjectsClient: SavedObjectsClientContract;
    });
    getFieldDefinitions(owner: string | string[]): Promise<FieldDefinitionsFindResponse>;
    getFieldDefinition(id: string): Promise<SavedObject<FieldDefinition>>;
    createFieldDefinition(input: CreateFieldDefinitionInput): Promise<SavedObject<FieldDefinition>>;
    updateFieldDefinition(id: string, input: UpdateFieldDefinitionInput): Promise<SavedObject<FieldDefinition>>;
    deleteFieldDefinition(id: string): Promise<void>;
}
