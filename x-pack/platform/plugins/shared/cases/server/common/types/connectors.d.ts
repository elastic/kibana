export type ConnectorPersistedFields = Array<{
    key: string;
    value: unknown;
}>;
export interface ConnectorPersisted {
    name: string;
    type: string;
    fields: ConnectorPersistedFields | null;
}
