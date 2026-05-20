import React from 'react';
import type { IngestFlow } from '../types';
interface IngestFlowCategoryProps {
    category: string;
    flows: IngestFlow[];
    onFlowClick: (flowId: string) => void;
}
export declare const IngestFlowCategory: React.FC<IngestFlowCategoryProps>;
export {};
