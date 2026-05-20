import type { SmlTypeDefinition } from './types';
export interface SmlTypeRegistry {
    register(definition: SmlTypeDefinition): void;
    has(typeId: string): boolean;
    get(typeId: string): SmlTypeDefinition | undefined;
    list(): SmlTypeDefinition[];
}
export declare const createSmlTypeRegistry: () => SmlTypeRegistry;
