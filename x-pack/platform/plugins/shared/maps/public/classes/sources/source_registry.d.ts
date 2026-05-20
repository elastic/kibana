import type { ISource } from './source';
export type SourceRegistryEntry = {
    ConstructorFunction: new (sourceDescriptor: any) => ISource;
    type: string;
};
export declare function registerSource(entry: SourceRegistryEntry): void;
export declare function getSourceByType(sourceType: string): SourceRegistryEntry | undefined;
