import React from 'react';
import type { EuiAvatarProps } from '@elastic/eui';
/**
 * Avatar component for the AI Assistant.
 */
export type AssistantAvatarProps = Omit<EuiAvatarProps, 'iconType' | 'initials' | 'initialsLength' | 'imageUrl'>;
/**
 * A `EuiAvatar` component customized for the AI Assistant.
 */
export declare const AssistantAvatar: ({ color, size, ...props }: AssistantAvatarProps) => React.JSX.Element;
