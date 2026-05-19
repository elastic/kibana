import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderStartDependencies } from '../../types';
export interface AgentBuilderAnnouncementChromeInnerProps {
    coreStart: CoreStart;
    pluginsStart: AgentBuilderStartDependencies;
}
export declare function AgentBuilderAnnouncementChromeInner({ coreStart, pluginsStart, }: AgentBuilderAnnouncementChromeInnerProps): React.JSX.Element;
