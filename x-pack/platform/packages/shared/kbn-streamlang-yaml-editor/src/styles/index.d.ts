import type { EuiThemeComputed } from '@elastic/eui';
import { type SerializedStyles } from '@emotion/react';
interface EditorPanelStylesParams {
    height: string;
}
interface EditorContainerStylesParams {
    euiTheme: EuiThemeComputed;
    glyphSize: string;
    glyphMarginTop: string;
}
interface FocusedStepOutlineStylesParams {
    euiTheme: EuiThemeComputed;
    scrollbarWidth?: string;
}
export declare const successMask: string;
export declare const failureMask: string;
export declare const infoMask: string;
export declare const circleMask: string;
export declare const getEditorPanelStyles: ({ height }: EditorPanelStylesParams) => SerializedStyles;
export declare const getEditorContainerStyles: ({ euiTheme, glyphSize, glyphMarginTop, }: EditorContainerStylesParams) => SerializedStyles;
export declare const getStepDecorationsStyles: (euiTheme: EuiThemeComputed) => SerializedStyles;
export declare const getStepActionsStyles: (euiTheme: EuiThemeComputed) => SerializedStyles;
export declare const getFocusedStepOutlineStyles: ({ euiTheme, scrollbarWidth, }: FocusedStepOutlineStylesParams) => SerializedStyles;
export {};
