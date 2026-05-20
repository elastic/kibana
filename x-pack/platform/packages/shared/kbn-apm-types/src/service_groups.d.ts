export interface ServiceGroup {
    groupName: string;
    kuery: string;
    description?: string;
    color?: string;
}
export interface SavedServiceGroup extends ServiceGroup {
    id: string;
    updatedAt: number;
}
