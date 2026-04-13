import React from 'react';
import type { FieldStatus } from './constants';
export declare const FieldStatusBadge: ({ status, uncommitted, streamType, }: {
    status: FieldStatus;
    uncommitted?: boolean;
    streamType?: "wired" | "classic" | "query" | "unknown";
}) => React.JSX.Element;
