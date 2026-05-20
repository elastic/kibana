import type { EuiThemeComputed } from '@elastic/eui';
export declare const createCommentActionCss: (euiTheme?: EuiThemeComputed<{}>) => import("@emotion/react").SerializedStyles;
export declare const getCommentFooterCss: (euiTheme?: EuiThemeComputed<{}>) => import("@emotion/react").SerializedStyles;
export declare const hasDraftComment: (applicationId: string | undefined, caseId: string, commentId: string, comment: string) => boolean;
