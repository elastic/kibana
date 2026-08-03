import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
/**
 * Props for the AI Assistant icon.
 */
export type AssistantIconProps = Omit<EuiIconProps, 'type'>;
/**
 * Default Elastic AI Assistant icon.
 */
export declare const AssistantIcon: ({ size, ...rest }: AssistantIconProps) => React.JSX.Element;
