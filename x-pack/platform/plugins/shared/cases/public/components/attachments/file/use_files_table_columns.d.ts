import { type EuiBasicTableColumn } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';
export interface FilesTableColumnsProps {
    caseId: string;
    showPreview: (file: FileJSON) => void;
}
export declare const useFilesTableColumns: ({ caseId, showPreview, }: FilesTableColumnsProps) => Array<EuiBasicTableColumn<FileJSON>>;
