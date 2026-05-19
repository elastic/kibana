import type { ImportFactoryOptions } from '../..';
import type { CreateDocsResponse, ImportDocMessage } from './file_reader_base';
import { FileReaderBase } from './file_reader_base';
export declare class MessageReader extends FileReaderBase {
    private _excludeLinesRegex;
    private _multilineStartRegex;
    constructor(options: ImportFactoryOptions);
    _createDocs(text: string, isLastPart: boolean, lineLimit?: number): CreateDocsResponse<ImportDocMessage>;
    private _processLine;
    private _addMessage;
}
