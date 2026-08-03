import type { ESQLControlVariable } from '@kbn/esql-types';
import React from 'react';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { RuleNotificationsValue } from '../../form/types';
import { composeFormToCreateRequest, composeFormToUpdateRequest, mapRuleToComposeFormValues } from './compose_mappers';
import { type BuilderState } from './rule_builder';
import type { ComposeDiscoverMode } from './types';
export interface ComposeDiscoverFlyoutProps {
    historyKey: symbol;
    mode?: ComposeDiscoverMode;
    /** The existing rule — provided when mode === 'edit'. Used to seed the RHF form. */
    rule?: Parameters<typeof mapRuleToComposeFormValues>[0];
    /** The ID of the rule being edited. Required when mode === 'edit'. */
    ruleId?: string;
    onClose: () => void;
    services: RuleFormServices;
    /**
     * Called with the create payload when the user submits in create mode. When the user
     * enables the notifications step, `notifications` carries the captured action draft list;
     * otherwise it is `undefined`.
     */
    onCreateRule: (payload: ReturnType<typeof composeFormToCreateRequest>, notifications?: RuleNotificationsValue) => void;
    /**
     * Called with id + update payload when the user submits in edit mode. When the user
     * configures simple actions, `notifications` carries the captured action draft list so
     * the caller can create linked action policies; otherwise it is `undefined`.
     */
    onUpdateRule?: (id: string, payload: ReturnType<typeof composeFormToUpdateRequest>, notifications?: RuleNotificationsValue) => void;
    /** True while a create/update mutation is in flight. */
    isSaving?: boolean;
    builderType?: string;
    initialBuilderState?: BuilderState;
    /** Pre-populated ES|QL query (e.g. from Discover). Seeds the base query in create mode. */
    initialQuery?: string;
    /** ES|QL control variables from Discover — inlined into initialQuery when provided. */
    esqlVariables?: ESQLControlVariable[];
}
export declare function ComposeDiscoverFlyout({ historyKey, mode, rule, ruleId, onClose, services, onCreateRule, onUpdateRule, isSaving, builderType, initialBuilderState, initialQuery, esqlVariables, }: ComposeDiscoverFlyoutProps): React.ReactElement | null;
