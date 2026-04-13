import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import React from 'react';
interface QueriesColumnProps {
    streamName: string;
    streamOnboardingResult?: TaskResult<OnboardingResult>;
}
export declare function QueriesColumn({ streamName, streamOnboardingResult }: QueriesColumnProps): React.JSX.Element;
export {};
