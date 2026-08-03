import React, { Component } from 'react';
import type { ImportResults } from '@kbn/file-upload-common';
interface Props {
    failedPermissionCheck: boolean;
    importResults?: ImportResults;
    dataViewResp?: object;
    indexName: string;
}
export declare class ImportCompleteView extends Component<Props, {}> {
    _renderCodeEditor(json: object | undefined, title: string, copyButtonDataTestSubj: string): React.JSX.Element | null;
    _getStatusMsg(): React.JSX.Element;
    _renderIndexManagementMsg(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
