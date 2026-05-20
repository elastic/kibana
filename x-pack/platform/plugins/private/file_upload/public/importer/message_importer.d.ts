import type { ImportFactoryOptions } from '@kbn/file-upload-common';
import { MessageReader } from '@kbn/file-upload-common';
import { Importer } from './importer';
export declare class MessageImporter extends Importer {
    protected _reader: MessageReader;
    constructor(options: ImportFactoryOptions);
}
