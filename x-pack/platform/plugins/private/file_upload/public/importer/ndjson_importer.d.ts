import { NdjsonReader } from '@kbn/file-upload-common';
import { Importer } from './importer';
export declare class NdjsonImporter extends Importer {
    protected _reader: NdjsonReader;
    constructor();
}
