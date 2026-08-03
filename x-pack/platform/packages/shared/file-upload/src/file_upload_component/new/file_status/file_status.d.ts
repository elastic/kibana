import type { FC } from 'react';
interface Props {
    index: number;
    showFileContentPreview?: boolean;
    showFileContents?: boolean;
    lite: boolean;
    showOverrideButton?: boolean;
    showExplanationButton?: boolean;
    showSettingsButton?: boolean;
}
export declare const FileStatus: FC<Props>;
export {};
