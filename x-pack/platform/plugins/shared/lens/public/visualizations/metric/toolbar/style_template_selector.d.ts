import React from 'react';
import type { MetricStyleTemplateId } from '@kbn/lens-common';
export declare function StyleTemplateSelector({ selectedTemplate, onSelectTemplate, }: {
    selectedTemplate: MetricStyleTemplateId;
    onSelectTemplate: (template: MetricStyleTemplateId) => void;
}): React.JSX.Element;
