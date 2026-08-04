import type { EuiThemeComputed } from '@elastic/eui';
import { ConversationDisplayStatus } from '@kbn/agent-builder-common';
export declare const createConversationListItemStyles: (euiTheme: EuiThemeComputed) => import("@emotion/utils").SerializedStyles;
export declare const createActiveConversationListItemStyles: (euiTheme: EuiThemeComputed) => import("@emotion/utils").SerializedStyles;
export declare const createStatusLinkStyles: (status: ConversationDisplayStatus | undefined, euiTheme: EuiThemeComputed) => import("@emotion/utils").SerializedStyles | undefined;
