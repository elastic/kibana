import type { ProductName } from './product';
export declare const LATEST_MANIFEST_FORMAT_VERSION = "2.0.0";
export interface ArtifactManifest {
    formatVersion: string;
    productName: ProductName;
    productVersion: string;
    /** Timestamp of the artifact creation */
    ts?: number | string;
}
