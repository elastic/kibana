import React, { Component } from 'react';
import type { GeoFileImporter, GeoFilePreview } from '../../importer/geo';
export type OnFileSelectParameters = GeoFilePreview & {
    indexName: string;
    importer: GeoFileImporter;
    getFilesTelemetry: () => {
        total_files: number;
        total_size_bytes: number;
        main_file_size: number;
        main_file_extension: string;
        sidecar_files: Array<{
            size: number;
            extension: string;
        }>;
    };
};
interface Props {
    onSelect: (onFileSelectParameters: OnFileSelectParameters) => void;
    onClear: () => void;
}
interface State {
    defaultIndexName: string | null;
    error: string | null;
    isLoadingPreview: boolean;
    importer: GeoFileImporter | null;
    previewSummary: string | null;
    file: File | null;
}
export declare class GeoFilePicker extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): Promise<void>;
    componentWillUnmount(): void;
    _onFileSelect: (files: FileList | null) => void;
    _loadFilePreview: () => Promise<void>;
    _renderHelpText(): string | React.JSX.Element;
    _renderImporterEditor(): React.ReactNode;
    render(): React.JSX.Element;
}
export {};
