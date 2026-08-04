import React from 'react';
import type { SpacesDataEntry } from '../../types';
interface Props {
    spaces: SpacesDataEntry[];
    selectedSpaceIds: string[];
    disabledSpaceIds: Set<string>;
    onChange: (selectedSpaceIds: string[]) => void;
    disabled?: boolean;
}
export declare const SelectableSpacesControl: (props: Props) => React.JSX.Element;
export {};
