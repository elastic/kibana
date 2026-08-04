import React from 'react';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { OnCaseDefaultChange } from '../case_default_fields';
interface TemplatePreviewProps {
    settings?: TemplateSettings;
    connector?: CaseConnectorWithoutName;
    onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
    onCaseDefaultChange?: OnCaseDefaultChange;
}
/**
 * Memoized so template-details (metadata) edits — which don't change `settings`, `connector`, or the
 * watched `definition` — never re-render this heavier YAML-backed preview (async user/tag lookups).
 */
export declare const TemplatePreview: React.NamedExoticComponent<TemplatePreviewProps>;
export {};
