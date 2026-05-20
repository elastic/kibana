import type { MutableRefObject } from 'react';
import type { CaseViewRefreshPropInterface } from '../../../common/ui/types';
import type { CasesNavigation } from '../links';
import type { CasesTimelineIntegration } from '../timeline_context';
export interface CasesRoutesProps {
    actionsNavigation?: CasesNavigation<string, 'configurable'>;
    /**
     * A React `Ref` that Exposes data refresh callbacks.
     * **NOTE**: Do not hold on to the `.current` object, as it could become stale
     */
    refreshRef?: MutableRefObject<CaseViewRefreshPropInterface>;
    timelineIntegration?: CasesTimelineIntegration;
}
