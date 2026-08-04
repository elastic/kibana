import type { SpaceItem } from '@kbn/context-switcher-components';
import type { Space } from '../../../common';
type SolutionKey = NonNullable<Space['solution']> | 'observability' | 'search';
export declare const useSpaceItems: ({ spaces, activeSpace, isServerless, allowSolutionVisibility, serverlessProjectType, }: {
    spaces?: Space[];
    activeSpace: Space | null;
    isServerless?: boolean;
    allowSolutionVisibility: boolean;
    serverlessProjectType?: SolutionKey;
}) => {
    spaceItems: SpaceItem[];
    activeSpaceItem?: SpaceItem;
};
export {};
