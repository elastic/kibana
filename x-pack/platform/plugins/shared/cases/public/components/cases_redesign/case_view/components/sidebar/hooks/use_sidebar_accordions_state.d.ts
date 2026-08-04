export type SidebarAccordionId = 'attributes' | 'legacyCustomFields' | 'templateFields' | 'connectors';
export type SidebarAccordionsState = Record<SidebarAccordionId, boolean>;
export declare const useSidebarAccordionsState: () => {
    isOpen: (id: SidebarAccordionId) => boolean;
    onToggle: (id: SidebarAccordionId, nextIsOpen: boolean) => void;
};
