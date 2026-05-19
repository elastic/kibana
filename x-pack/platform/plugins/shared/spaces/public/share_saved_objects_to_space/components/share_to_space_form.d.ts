import React from 'react';
import type { SpacesDataEntry } from '../../types';
import type { ShareOptions } from '../types';
interface Props {
    spaces: SpacesDataEntry[];
    objectNoun: string;
    onUpdate: (shareOptions: ShareOptions) => void;
    shareOptions: ShareOptions;
    showCreateCopyCallout: boolean;
    canShareToAllSpaces: boolean;
    makeCopy: () => void;
    enableCreateNewSpaceLink: boolean;
    enableSpaceAgnosticBehavior: boolean;
    prohibitedSpaces: Set<string>;
}
export declare const ShareToSpaceForm: (props: Props) => React.JSX.Element;
export {};
