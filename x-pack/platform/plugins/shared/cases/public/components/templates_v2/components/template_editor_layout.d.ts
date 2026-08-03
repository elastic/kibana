import React from 'react';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import type { TemplateMetadata, TemplateMetadataErrors } from '../utils/template_metadata';
import type { OnCaseDefaultChange } from '../case_default_fields';
interface TemplateEditorLayoutProps {
    isLoading?: boolean;
    yamlValue: string;
    onYamlChange: (value: string) => void;
    onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
    onCaseDefaultChange?: OnCaseDefaultChange;
    isYamlSaving: boolean;
    isYamlSaved: boolean;
    previewWidth: number;
    onPreviewWidthChange: (width: number) => void;
    savedValue?: string;
    settings?: TemplateSettings;
    connector?: CaseConnectorWithoutName;
    onSettingsChange: (settings: TemplateSettings) => void;
    onConnectorChange: (connector: CaseConnectorWithoutName) => void;
    metadata: TemplateMetadata;
    metadataErrors: TemplateMetadataErrors;
    onMetadataChange: (metadata: TemplateMetadata) => void;
    formResetKey?: number;
    /** The Fields YAML has validation errors — surfaces an indicator on the Fields tab. */
    fieldsHaveErrors?: boolean;
}
/**
 * The template editor: full-area `Fields` and `Configuration` tabs. The YAML editor is only rendered
 * on the Fields tab (alongside its live two-way preview), so it is never shown beside content it is
 * not bound to. Configuration (identity + settings + connector) is panel-owned. A required-name
 * indicator on the Configuration tab surfaces when the template name is missing/invalid, so
 * defaulting to the Fields tab never hides that required step.
 *
 * The preview is always mounted; it renders its own empty/invalid states from the definition
 * internally. It must NOT be unmounted while the YAML is invalid — remounting on recovery would
 * reset its watch subscription and leave it stale until a tab switch.
 */
export declare const TemplateEditorLayout: React.FC<TemplateEditorLayoutProps>;
export {};
