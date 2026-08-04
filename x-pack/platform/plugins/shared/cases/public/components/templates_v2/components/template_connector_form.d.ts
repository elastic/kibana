import React from 'react';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
interface Props {
    connector?: CaseConnectorWithoutName;
    onChange: (connector: CaseConnectorWithoutName) => void;
}
/**
 * Editable connector picker + native dynamic fields form, reused from the create-case flow. Runs in
 * its own hook_form_lib form (separate from the editor's react-hook-form); changes are lifted via
 * `onChange` and serialized into the definition YAML on submit.
 */
export declare const TemplateConnectorForm: React.FC<Props>;
export {};
