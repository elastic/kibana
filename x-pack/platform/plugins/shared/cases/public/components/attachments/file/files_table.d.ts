import React from 'react';
import type { Pagination, EuiBasicTableProps } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';
interface FilesTableProps {
    caseId: string;
    isLoading: boolean;
    items: FileJSON[];
    onChange: EuiBasicTableProps<FileJSON>['onChange'];
    pagination: Pagination;
}
export declare const FilesTable: {
    ({ caseId, items, pagination, onChange, isLoading }: FilesTableProps): React.JSX.Element;
    displayName: string;
};
export {};
