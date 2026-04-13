import React from 'react';
import type { Insight } from '@kbn/streams-schema';
interface InsightCardProps {
    insight: Insight;
    index: number;
}
export declare function InsightCard({ insight, index }: InsightCardProps): React.JSX.Element;
export {};
