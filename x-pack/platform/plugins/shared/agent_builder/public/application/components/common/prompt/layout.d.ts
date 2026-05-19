import React from 'react';
import type { IconType } from '@elastic/eui';
export declare const PROMPT_LAYOUT_VARIANTS: {
    readonly DEFAULT: "default";
    readonly EMBEDDABLE: "embeddable";
};
export type PromptLayoutVariant = typeof PROMPT_LAYOUT_VARIANTS.DEFAULT | typeof PROMPT_LAYOUT_VARIANTS.EMBEDDABLE;
interface IconProps {
    imageSrc?: string;
    iconType?: IconType;
}
export type PromptLayoutProps = {
    title: React.ReactNode;
    subtitle: React.ReactNode;
    primaryButton: React.ReactNode;
    secondaryButton?: React.ReactNode;
    variant: PromptLayoutVariant;
} & IconProps;
export declare const PromptLayout: React.FC<PromptLayoutProps>;
export {};
