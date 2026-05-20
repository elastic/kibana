import type { DropType } from '@kbn/dom-drag-drop';
import type { TextBasedPrivateState, GetDropPropsArgs } from '@kbn/lens-common';
export declare const getDropProps: (props: GetDropPropsArgs<TextBasedPrivateState>) => {
    dropTypes: DropType[];
    nextLabel?: string;
} | undefined;
