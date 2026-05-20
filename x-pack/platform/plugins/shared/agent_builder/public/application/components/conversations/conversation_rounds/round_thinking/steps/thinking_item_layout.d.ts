import type { ToolCallStep } from '@kbn/agent-builder-common';
import type { ReactNode } from 'react';
import React from 'react';
interface ThinkingItemLayoutProps {
    children: ReactNode;
    icon?: ReactNode;
    loading?: boolean;
    accordionContent?: ToolCallStep['params'];
    textColor?: string;
}
export declare const ThinkingItemLayout: React.FC<ThinkingItemLayoutProps>;
export {};
