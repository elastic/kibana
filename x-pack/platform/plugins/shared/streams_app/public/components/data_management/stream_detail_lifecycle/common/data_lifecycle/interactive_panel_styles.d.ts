import type { useEuiTheme } from '@elastic/eui';
export interface InteractivePanelStylesOptions {
    euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
    backgroundColor?: string;
    isPopoverOpen: boolean;
    minHeight?: string;
    minWidth?: string;
    padding?: string;
    fullSize?: boolean;
    alignCenter?: boolean;
    extraStyles?: Record<string, string | number>;
}
export declare const getInteractivePanelStyles: ({ euiTheme, backgroundColor, isPopoverOpen, minHeight, minWidth, padding, fullSize, alignCenter, extraStyles, }: InteractivePanelStylesOptions) => {
    display?: string | undefined;
    alignItems?: string | undefined;
    justifyContent?: string | undefined;
    height?: string | undefined;
    width?: string | undefined;
    padding?: string | undefined;
    minWidth?: string | undefined;
    minHeight?: string | undefined;
    backgroundColor: string | undefined;
    margin: string;
    borderRadius: import("csstype").Property.BorderRadius<string | number> | undefined;
    boxShadow: string;
    transform: string;
    transition: string;
    '&:hover': {
        backgroundColor: string | undefined;
        transform: string;
        boxShadow: string;
    };
    '&:focus': {
        transform: string;
        boxShadow: string;
    };
    '&:active': {
        transform: string;
        boxShadow: string;
    };
};
