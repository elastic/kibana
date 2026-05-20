import React from 'react';
import type { SpacesDataEntry } from '../../types';
import type { ShareOptions } from '../types';
interface Props {
    spaces: SpacesDataEntry[];
    objectNoun: string;
    canShareToAllSpaces: boolean;
    shareOptions: ShareOptions;
    onChange: (selectedSpaceIds: string[]) => void;
    enableCreateNewSpaceLink: boolean;
    enableSpaceAgnosticBehavior: boolean;
    prohibitedSpaces: Set<string>;
}
export declare const ShareModeControl: (props: Props) => React.JSX.Element;
export {};
