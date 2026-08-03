import React from 'react';
import type { SpacesDataEntry } from '../../types';
import type { CopyOptions, CopyToSpaceSavedObjectTarget } from '../types';
interface Props {
    savedObjectTarget: Required<CopyToSpaceSavedObjectTarget>;
    spaces: SpacesDataEntry[];
    onUpdate: (copyOptions: CopyOptions) => void;
    copyOptions: CopyOptions;
}
export declare const CopyToSpaceForm: (props: Props) => React.JSX.Element;
export {};
