import React from 'react';
import type { CaseViewProps } from './types';
export declare const CaseViewLoading: {
    (): React.JSX.Element;
    displayName: string;
};
export declare const CaseView: React.MemoExoticComponent<({ actionsNavigation, timelineIntegration, refreshRef }: CaseViewProps) => React.JSX.Element | null>;
export { CaseView as default };
