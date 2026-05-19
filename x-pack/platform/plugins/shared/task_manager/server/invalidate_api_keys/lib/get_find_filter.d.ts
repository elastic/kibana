interface GetFindFilterOpts {
    removalDelay: string;
    excludedSOIds?: string[];
    savedObjectType: string;
}
export declare function getFindFilter(opts: GetFindFilterOpts): string;
export {};
