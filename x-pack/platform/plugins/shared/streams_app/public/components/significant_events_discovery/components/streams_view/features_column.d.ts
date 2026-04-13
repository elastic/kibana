import type { OnboardingResult, Streams, TaskResult } from '@kbn/streams-schema';
import React from 'react';
interface FeaturesColumnProps {
    stream: Streams.all.Definition;
    streamOnboardingResult?: TaskResult<OnboardingResult>;
}
export declare function FeaturesColumn({ stream, streamOnboardingResult }: FeaturesColumnProps): React.JSX.Element;
export {};
