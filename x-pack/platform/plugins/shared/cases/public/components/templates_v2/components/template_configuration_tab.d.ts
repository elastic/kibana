import React from 'react';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import type { TemplateMetadata, TemplateMetadataErrors } from '../utils/template_metadata';
interface TemplateConfigurationTabProps {
    metadata: TemplateMetadata;
    metadataErrors: TemplateMetadataErrors;
    onMetadataChange: (metadata: TemplateMetadata) => void;
    settings?: TemplateSettings;
    connector?: CaseConnectorWithoutName;
    onSettingsChange: (settings: TemplateSettings) => void;
    onConnectorChange: (connector: CaseConnectorWithoutName) => void;
    formResetKey?: number;
}
/**
 * The Configuration tab: a Kibana settings-page (described-form-group) for the template's identity
 * (name/description/tags), case settings, and default connector. None of this lives in the editor
 * YAML — it is panel-owned and merged into the definition on save. The connector form is
 * error-boundaried so a flaky async connector fetch can never blank the tab.
 */
export declare const TemplateConfigurationTab: React.FC<TemplateConfigurationTabProps>;
export {};
