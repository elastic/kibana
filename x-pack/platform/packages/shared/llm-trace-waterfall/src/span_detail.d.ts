import React from 'react';
import type { SpanNode } from './types';
interface SpanDetailProps {
    span: SpanNode;
    onClose: () => void;
    useTabs?: boolean;
}
export declare const SpanDetail: React.FC<SpanDetailProps>;
export {};
