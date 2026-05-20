import { type ThemeServiceStart } from '@kbn/core/public';
import React from 'react';
export interface GroupingPreviewProps {
    dependencies: GroupingPreviewDependencies;
}
export interface GroupingPreviewDependencies {
    theme: ThemeServiceStart;
}
export declare const GroupingPreview: React.FC<GroupingPreviewProps>;
export declare const GroupingPreviewLight: React.FC;
export declare const GroupingPreviewDark: React.FC;
