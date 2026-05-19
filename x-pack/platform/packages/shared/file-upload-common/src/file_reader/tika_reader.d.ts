import type { CreateDocsResponse, ImportDocTika } from './file_reader_base';
import { FileReaderBase } from './file_reader_base';
export declare class TikaReader extends FileReaderBase {
    read(data: ArrayBuffer): ImportDocTika[];
    protected _createDocs(base64String: string): CreateDocsResponse<ImportDocTika>;
}
