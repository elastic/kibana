import type { EuiThemeComputed } from '@elastic/eui-theme-common';
import type { SimplifiedAgentStatus } from '../../../types';
export declare const AGENT_STATUSES: SimplifiedAgentStatus[];
export declare function getColorForAgentStatus(agentStatus: SimplifiedAgentStatus, euiTheme: EuiThemeComputed<{}>): string;
export declare function getLabelForAgentStatus(agentStatus: SimplifiedAgentStatus): string;
