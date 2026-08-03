import React from 'react';
import type { ActionConnector, ActionTypeRegistryContract } from '../../../../types';
export interface CreateConnectorFormProps {
    actionTypeRegistry: ActionTypeRegistryContract;
    /** The connector type to create. Pre-selected — no type picker is shown. */
    actionTypeId: string;
    /** Optional name to pre-fill into the form. */
    initialName?: string;
    /** Carried for provider parity (consumed by ConnectorProvider in the wrapper). */
    isServerless?: boolean;
    /** Reports validity/saving so a host (e.g. a flyout/canvas) can drive its own Save button. */
    onStateChange?: (status: CreateConnectorFormStatus) => void;
    /** Hands the host an imperative handle to submit the form. */
    onReady?: (handle: CreateConnectorFormHandle) => void;
}
export interface CreateConnectorFormStatus {
    /** Whether an external Save button should be disabled. */
    isSubmitDisabled: boolean;
    /** Whether a create is in flight (or the form is submitting). */
    isSaving: boolean;
}
export interface CreateConnectorFormHandle {
    /** Validate the form and create the connector. Resolves to the created connector, or undefined when invalid. */
    submit: () => Promise<ActionConnector | undefined>;
}
export declare const CreateConnectorForm: React.NamedExoticComponent<CreateConnectorFormProps>;
export { CreateConnectorForm as default };
