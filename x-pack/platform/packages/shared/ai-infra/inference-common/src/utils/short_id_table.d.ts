export declare class ShortIdTable {
    private byShortId;
    private byOriginalId;
    constructor();
    take(originalId: string): string;
    lookup(shortId: string): string | undefined;
}
