import type { MutableRefObject } from 'react';
import type { DescriptionMarkdownRefObject } from '../types';
interface UseLensDraftDescriptionArgs {
    isEditable: boolean;
    setIsEditable: (value: boolean) => void;
    descriptionMarkdownRef: MutableRefObject<DescriptionMarkdownRefObject | null>;
}
export declare const useLensDraftDescription: ({ isEditable, setIsEditable, descriptionMarkdownRef, }: UseLensDraftDescriptionArgs) => {
    handleOnChangeEditable: () => void;
};
export {};
