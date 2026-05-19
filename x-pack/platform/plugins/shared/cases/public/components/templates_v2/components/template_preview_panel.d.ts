import React from 'react';
import type { ParsedTemplateEntry } from '../hooks/use_parse_yaml';
export interface TemplatePreviewPanelProps {
    template: ParsedTemplateEntry;
    onClose: () => void;
    flyoutRef: React.RefObject<HTMLDivElement | null>;
}
export declare const TemplatePreviewPanel: React.FC<TemplatePreviewPanelProps>;
