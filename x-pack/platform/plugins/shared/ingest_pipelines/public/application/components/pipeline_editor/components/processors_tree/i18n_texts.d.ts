import type { ProcessorSelector } from '../../types';
export declare const processorsTreeI18nTexts: {
    getSectionLabel: (baseSelector: ProcessorSelector) => string;
    getSectionLabelForSelector: (selector: ProcessorSelector) => string;
    moveToEmptyTreeLabel: ({ movingProcessor, sectionLabel, }: {
        movingProcessor: string;
        sectionLabel: string;
    }) => string;
};
