import React from 'react';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SpacesManager } from '../spaces_manager';
interface ContextSwitcherComponentProps {
    spacesManager: SpacesManager;
    core: CoreStart;
    cloud?: CloudStart;
    isServerless?: boolean;
    allowSolutionVisibility: boolean;
}
export declare const ContextSwitcherComponent: (props: ContextSwitcherComponentProps) => React.JSX.Element;
export {};
