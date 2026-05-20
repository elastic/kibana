import React from 'react';
import type { Section } from '../sections';
interface Props {
    section?: Section;
    children?: React.ReactNode;
    notificationsBySection?: Partial<Record<Section, number>>;
    noSpacerInContent?: boolean;
}
export declare const DefaultLayout: React.FC<Props>;
export {};
