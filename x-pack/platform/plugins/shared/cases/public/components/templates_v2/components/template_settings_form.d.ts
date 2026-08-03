import React from 'react';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
export interface TemplateSettingsFormProps {
    settings?: TemplateSettings;
    connector?: CaseConnectorWithoutName;
    onSettingsChange: (settings: TemplateSettings) => void;
    onConnectorChange: (connector: CaseConnectorWithoutName) => void;
    /**
     * Bumped by the parent on Reset. Used as part of the connector form's `key` so it remounts and
     * re-seeds from the reverted connector (its inner form only reads `defaultValue` at mount).
     */
    formResetKey?: number;
    compact?: boolean;
}
export declare const TemplateSettingsForm: React.FC<TemplateSettingsFormProps>;
