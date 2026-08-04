import React from 'react';
import type { ReactNode } from 'react';
export interface SettingsSectionProps {
    title: string;
    description: ReactNode;
    children: ReactNode;
    'data-test-subj'?: string;
}
export declare const SettingsSection: React.NamedExoticComponent<SettingsSectionProps>;
