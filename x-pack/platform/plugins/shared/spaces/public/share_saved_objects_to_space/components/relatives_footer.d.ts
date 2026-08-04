import React from 'react';
import type { SavedObjectReferenceWithContext } from '@kbn/core-saved-objects-api-server';
import type { ShareToSpaceSavedObjectTarget } from '../types';
interface Props {
    savedObjectTarget: ShareToSpaceSavedObjectTarget;
    referenceGraph: SavedObjectReferenceWithContext[];
    isDisabled: boolean;
}
export declare const RelativesFooter: (props: Props) => React.JSX.Element | null;
export {};
