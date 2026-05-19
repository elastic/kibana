import type { ValidationConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CaseActionConnector } from '../../types';
export declare const isAnyRequiredFieldNotSet: (mapping: Record<string, unknown> | undefined) => boolean;
/**
 * The user can use either a connector of type cases or all.
 * If the connector is of type all we should check if all
 * required field have been configured.
 */
export declare const connectorValidator: (connector: CaseActionConnector) => ReturnType<ValidationConfig["validator"]>;
