import type { EuiBadgeProps } from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
export declare enum AgentVisibility {
    Private = "private",
    Public = "public",
    Shared = "shared"
}
/** Map from agent visibility to the icon used in the UI. */
export declare const VISIBILITY_ICON: Record<AgentVisibility, EuiIconType>;
export declare const VISIBILITY_BADGE_COLOR: Record<AgentVisibility, EuiBadgeProps['color']>;
