import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
export declare const MLEmptyPromptCard: ({ title, body, actions, iconSrc, iconAlt, customCss, iconSize, "data-test-subj": dataTestSubj, }: Omit<EuiEmptyPromptProps, "title"> & {
    title: string;
    iconSrc: string;
    iconAlt: string;
    iconSize?: "fullWidth" | "original" | "s" | "m" | "l" | "xl";
    customCss?: SerializedStyles;
}) => React.JSX.Element;
