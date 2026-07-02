import React from 'react';
import * as i18n from './translations';
export type { AgentBuilderAnnouncementVariant } from './translations';
export interface AgentBuilderAnnouncementModalProps {
    variant: i18n.AgentBuilderAnnouncementVariant;
    onRevert: () => void;
    onContinue: () => void;
}
export declare const AgentBuilderAnnouncementModal: React.FC<AgentBuilderAnnouncementModalProps>;
