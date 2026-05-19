export interface AttachmentTypeRegistryBaseItem {
    id: string;
}
export declare class AttachmentTypeRegistry<T extends AttachmentTypeRegistryBaseItem> {
    private readonly name;
    private readonly collection;
    constructor(name: string);
    /**
     * Returns true if the registry has the given type registered
     */
    has(id: string): boolean;
    /**
     * Registers an item to the registry
     */
    register(item: T): void;
    /**
     * Returns an item, throw error if not registered
     */
    get(id: string): T;
    list(): T[];
}
