import React from 'react';
import type { LogoutReason } from '../../../../common/types';
export declare enum MessageType {
    None = 0,
    Info = 1,
    Danger = 2
}
export interface FormMessage {
    type: MessageType;
    content?: string;
}
export declare const formMessages: Record<LogoutReason, FormMessage>;
export declare function renderMessage(message: FormMessage): React.JSX.Element | null;
