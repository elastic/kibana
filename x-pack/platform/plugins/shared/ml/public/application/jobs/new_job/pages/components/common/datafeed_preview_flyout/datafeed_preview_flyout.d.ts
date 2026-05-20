import type { FC } from 'react';
export declare enum EDITOR_MODE {
    HIDDEN = 0,
    READONLY = 1,
    EDITABLE = 2
}
interface Props {
    isDisabled: boolean;
}
export declare const DatafeedPreviewFlyout: FC<Props>;
export {};
