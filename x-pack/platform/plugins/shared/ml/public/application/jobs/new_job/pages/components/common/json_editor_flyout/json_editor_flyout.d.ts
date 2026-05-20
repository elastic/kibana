import type { FC } from 'react';
export declare enum EDITOR_MODE {
    HIDDEN = 0,
    READONLY = 1,
    EDITABLE = 2
}
interface Props {
    isDisabled: boolean;
    jobEditorMode: EDITOR_MODE;
    datafeedEditorMode: EDITOR_MODE;
}
export declare const JsonEditorFlyout: FC<Props>;
export {};
