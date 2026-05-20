export declare const MAX_IMAGE_SIZE = 64;
export declare function readFile(data: File): Promise<string>;
export declare function resizeImage(imageUrl: string, maxSize: number): Promise<string>;
export declare function createImageHandler(callback: (imageUrl: string | undefined) => void): (files: FileList | null) => Promise<void>;
/**
 * Returns the hex representation of a random color (e.g `#F1B7E2`)
 */
export declare function getRandomColor(): string;
export declare const VALID_HEX_COLOR: RegExp;
