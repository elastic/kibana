import React from 'react';
import type { ActionDraft, ActionTemplate } from '../types';
interface ActionTemplateCard {
    key: string;
    template: ActionTemplate;
    label: string;
    description: string;
    iconType: string;
}
export declare const getTemplateForAction: (action: ActionDraft) => ActionTemplate;
export declare const findActionTemplateCard: (template: ActionTemplate) => ActionTemplateCard | undefined;
interface ActionTemplateCardsProps {
    onPick: (template: ActionTemplate) => void;
    onCancel?: () => void;
}
export declare const ActionTemplateCards: ({ onPick, onCancel }: ActionTemplateCardsProps) => React.JSX.Element;
export {};
