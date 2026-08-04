import type { FC, ReactNode } from 'react';
import type { SidebarAccordionId } from './hooks/use_sidebar_accordions_state';
interface SidebarAccordionSectionProps {
    id: SidebarAccordionId;
    title: ReactNode;
    extraAction?: ReactNode;
    isOpen: boolean;
    onToggle: (id: SidebarAccordionId, isOpen: boolean) => void;
    children: ReactNode;
    'data-test-subj'?: string;
}
export declare const SidebarAccordionSection: FC<SidebarAccordionSectionProps>;
export {};
