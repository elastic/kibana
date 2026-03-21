import type { FC } from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import { type Space } from '../../../common';
interface PageProps {
    spaceId?: string;
    history: ScopedHistory;
    selectedTabId?: string;
    getFeatures: FeaturesPluginStart['getFeatures'];
    onLoadSpace: (space: Space) => void;
    allowFeatureVisibility: boolean;
    allowSolutionVisibility: boolean;
}
export declare const EditSpace: FC<PageProps>;
export {};
