export declare const spaceResourcePrefix = "space:";
export declare class ResourceSerializer {
    static serializeSpaceResource(spaceId: string): string;
    static deserializeSpaceResource(resource: string): string;
    static isSerializedSpaceResource(resource: string): boolean;
}
