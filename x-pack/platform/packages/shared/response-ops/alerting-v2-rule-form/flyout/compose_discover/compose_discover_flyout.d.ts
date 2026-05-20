import React from 'react';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { mapRuleToComposeFormValues, composeFormToCreateRequest, composeFormToUpdateRequest } from './compose_mappers';
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
    /** Called with the create payload when the user submits in create mode. */
    onCreateRule: (payload: ReturnType<typeof composeFormToCreateRequest>) => void;
    /** Called with id + update payload when the user submits in edit mode. */
    onUpdateRule?: (id: string, payload: ReturnType<typeof composeFormToUpdateRequest>) => void;
    /** True while a create/update mutation is in flight. */
    isSaving?: boolean;
}
export declare const ComposeDiscoverFlyout: React.FC<ComposeDiscoverFlyoutProps>;
