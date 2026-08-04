import type { ZipArchive } from '../utils/zip_archive';
type ValidationResult = {
    valid: true;
} | {
    valid: false;
    error: string;
};
export declare const validateArtifactArchive: (archive: ZipArchive) => ValidationResult;
export {};
