import React from 'react';
import type { SpacesDataEntry } from '../../types';
import type { ShareOptions } from '../types';
interface Props {
    spaces: SpacesDataEntry[];
    shareOptions: ShareOptions;
    onChange: (selectedSpaceIds: string[]) => void;
    enableCreateNewSpaceLink: boolean;
    enableSpaceAgnosticBehavior: boolean;
    prohibitedSpaces: Set<string>;
}
export declare const SelectableSpacesControl: (props: Props) => React.JSX.Element;
export {};
