import type { CreateDocsResponse } from './file_reader_base';
import { FileReaderBase } from './file_reader_base';
export declare class NdjsonReader extends FileReaderBase {
    protected _createDocs(json: string, isLastPart: boolean): CreateDocsResponse<string>;
}
