import type { MutableRefObject } from 'react';
import React from 'react';
export declare function SettingWithSiblingFlyout({ siblingRef, children, title, isInlineEditing, SettingTrigger, dataTestSubj, }: {
    title?: string;
    siblingRef: MutableRefObject<HTMLDivElement | null>;
    SettingTrigger: ({ onClick }: {
        onClick: () => void;
    }) => JSX.Element;
    children?: React.ReactElement | React.ReactElement[];
    isInlineEditing?: boolean;
    dataTestSubj?: string;
}): React.JSX.Element;
