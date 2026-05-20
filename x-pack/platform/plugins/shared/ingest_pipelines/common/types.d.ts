export interface ESProcessorConfig {
    on_failure?: Processor[];
    ignore_failure?: boolean;
    if?: string;
    tag?: string;
    [key: string]: any;
}
export interface Processor {
    [typeName: string]: ESProcessorConfig;
}
export interface Pipeline {
    name: string;
    description?: string;
    version?: number;
    processors: Processor[];
    _meta?: {
        [key: string]: any;
    };
    on_failure?: Processor[];
    isManaged?: boolean;
    deprecated?: boolean;
}
export declare enum FieldCopyAction {
    Copy = "copy",
    Rename = "rename"
}
export type DatabaseType = 'maxmind' | 'ipinfo' | 'web' | 'local' | 'unknown';
export interface DatabaseNameOption {
    value: string;
    text: string;
}
export interface GeoipDatabase {
    name: string;
    id: string;
    type: DatabaseType;
}
