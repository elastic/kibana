export declare function getSafePath(name: string, volume?: string): {
    fullPath: string;
    alias: string;
};
export declare function ensureDirectory(path: string): Promise<void>;
export declare function ensureDirectorySync(path: string): void;
