import React from 'react';
interface HookErrorData {
    message: string;
    meta?: {
        hookId?: string;
        hookLifecycle?: string;
        hookMode?: string;
    };
}
interface HookErrorProps {
    error: HookErrorData;
}
export declare const HookError: React.FC<HookErrorProps>;
export {};
