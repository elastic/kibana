import type { MutableRefObject } from 'react';
import type { CasesTimelineIntegration } from '../timeline_context';
import type { CasesNavigation } from '../links';
import type { CaseViewRefreshPropInterface, CaseUI } from '../../../common';
export interface CaseViewBaseProps {
    onComponentInitialized?: () => void;
    actionsNavigation?: CasesNavigation<string, 'configurable'>;
    /**
     * A React `Ref` that Exposes data refresh callbacks.
     * **NOTE**: Do not hold on to the `.current` object, as it could become stale
     */
    refreshRef?: MutableRefObject<CaseViewRefreshPropInterface>;
}
export interface CaseViewProps extends CaseViewBaseProps {
    timelineIntegration?: CasesTimelineIntegration;
}
export interface CaseViewPageProps extends CaseViewBaseProps {
    fetchCase: () => void;
    caseData: CaseUI;
}
export interface OnUpdateFields {
    key: keyof CaseUI | string;
    value: CaseUI[keyof CaseUI] | unknown;
    onSuccess?: () => void;
    onError?: () => void;
}
