import React from 'react';
import type { DescriptionGenerationTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/description_generation/route';
import type { AIFeatures } from '../../../hooks/use_ai_features';
interface DescriptionGenerationControlProps {
    isTaskLoading: boolean;
    task: DescriptionGenerationTaskResult | undefined;
    taskError: Error | undefined;
    refreshTask: () => Promise<DescriptionGenerationTaskResult>;
    getDescriptionGenerationStatus: () => Promise<DescriptionGenerationTaskResult>;
    scheduleDescriptionGenerationTask: (connectorId: string) => Promise<void>;
    cancelDescriptionGenerationTask: () => Promise<void>;
    aiFeatures: AIFeatures | null;
    disabled?: boolean;
}
export declare function DescriptionGenerationControl({ isTaskLoading, task, taskError, refreshTask, getDescriptionGenerationStatus, scheduleDescriptionGenerationTask, cancelDescriptionGenerationTask, aiFeatures, disabled, }: DescriptionGenerationControlProps): React.JSX.Element | null | undefined;
export {};
