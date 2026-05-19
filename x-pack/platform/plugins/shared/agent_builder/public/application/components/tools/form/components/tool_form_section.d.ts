import type { IconType } from '@elastic/eui';
import type { FC, PropsWithChildren, ReactNode } from 'react';
export interface ToolFormSectionDocumentation {
    title: string;
    href: string;
}
export interface ToolFormSectionProps {
    title: string;
    icon: IconType;
    description: string;
    content?: ReactNode;
    documentation?: ToolFormSectionDocumentation;
}
export declare const ToolFormSection: FC<PropsWithChildren<ToolFormSectionProps>>;
