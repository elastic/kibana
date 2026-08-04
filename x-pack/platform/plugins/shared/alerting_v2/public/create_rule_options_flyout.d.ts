import React from 'react';
import type { History } from 'history';
import type { ESQLControlVariable } from '@kbn/esql-types';
export interface CreateRuleOptionsFlyoutLegacyItem {
    id: string;
    label: string;
    render: (onClose: () => void) => React.ReactElement | null;
    'data-test-subj'?: string;
}
export interface CreateRuleOptionsFlyoutProps {
    onClose: () => void;
    initialQuery?: string;
    esqlVariables?: ESQLControlVariable[];
    legacyRuleTypes?: CreateRuleOptionsFlyoutLegacyItem[];
    /**
     * When provided, the flyout reactively tracks the current ES|QL query
     * via `useSyncExternalStore`. Updates propagate into the compose form only
     * while the form has not been edited; after that, use the sandbox to adjust
     * the query.
     */
    subscribe?: (listener: () => void) => () => void;
    getQuery?: () => string | undefined;
    getEsqlVariables?: () => ESQLControlVariable[] | undefined;
    /** Scoped history of the host app — used to close the flyout on in-app navigation. */
    history?: History;
}
export declare const CreateRuleOptionsFlyout: (props: CreateRuleOptionsFlyoutProps) => React.JSX.Element;
