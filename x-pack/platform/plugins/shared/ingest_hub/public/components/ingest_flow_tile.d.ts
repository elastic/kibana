import React from 'react';
import type { IngestFlow } from '../types';
interface IngestFlowTileProps {
    flow: IngestFlow;
    onClick: () => void;
}
export declare const IngestFlowTile: React.FC<IngestFlowTileProps>;
export {};
