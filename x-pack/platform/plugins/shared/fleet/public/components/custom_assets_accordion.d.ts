import type { FunctionComponent } from 'react';
export interface CustomAssetsAccordionProps {
    views: Array<{
        name: string;
        url: string;
        description: string;
    }>;
    initialIsOpen?: boolean;
    title?: string;
}
export declare const CustomAssetsAccordion: FunctionComponent<CustomAssetsAccordionProps>;
