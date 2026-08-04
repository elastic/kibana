import type { ReactNode } from 'react';
import type { ActionConnector, ActionTypeRegistryContract } from '../../../types';
import type { ConnectorFormState } from './connector_form';
export interface UseConnectorCreateFormParams {
    actionTypeRegistry: ActionTypeRegistryContract;
    /**
     * The connector type to create. `undefined` while no type is selected yet
     * (e.g. the flyout before the user picks a type).
     */
    actionTypeId: string | undefined;
    /** Optional initial values merged onto the empty connector (name, config, …). */
    initialConnector?: Partial<Omit<ActionConnector, 'secrets'>>;
}
/**
 * Shared core for creating a connector: resolves the action type model (stack
 * or spec-based), holds the `ConnectorForm` state, exposes a
 * `validateAndCreateConnector` that validates → runs the pre-submit validator →
 * POSTs via `useCreateConnector`, and surfaces the derived flags/error states a
 * host needs to drive its own Save button and callouts.
 */
export declare const useConnectorCreateForm: ({ actionTypeRegistry, actionTypeId, initialConnector, }: UseConnectorCreateFormParams) => {
    actionTypeModel: import("@kbn/alerts-ui-shared").ActionTypeModel<any, any, any> | null;
    isLoadingActionTypeModel: boolean;
    actionTypeModelError: Error | null;
    refetchConnectorSpec: () => void;
    showLoadingSpinner: boolean;
    formState: ConnectorFormState;
    setFormState: import("react").Dispatch<import("react").SetStateAction<ConnectorFormState>>;
    defaultConnector: {
        actionTypeId: string;
        isDeprecated: boolean;
        config: {};
        secrets: {};
        isMissingSecrets: boolean;
        isConnectorTypeDeprecated: boolean;
    };
    canSave: any;
    isSaving: boolean;
    hasErrors: boolean;
    isSubmitDisabled: boolean;
    showFormErrors: boolean;
    setShowFormErrors: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    preSubmitValidationErrorMessage: ReactNode;
    createConnectorError: import("../../hooks/use_create_connector").CreateConnectorError | null;
    validateAndCreateConnector: () => Promise<ActionConnector | undefined>;
};
