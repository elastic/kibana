import type { FC } from 'react';
interface Props {
    processors: object[];
    onDownload(): void;
    onClickToCreatePipeline(): void;
    onUpdateProcessors(processors: object[]): void;
    hasError: boolean;
}
export declare const PipelinesPreview: FC<Props>;
export {};
