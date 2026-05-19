import { TikaReader } from '@kbn/file-upload-common';
import { Importer } from './importer';
export declare class TikaImporter extends Importer {
    protected _reader: TikaReader;
    constructor();
}
