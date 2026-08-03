import React from 'react';
import type { RevokeApplicationConnectionsModalConnection, RevokedApplicationConnection } from './constants/types';
export interface RevokeApplicationConnectionsModalProps {
    connections: RevokeApplicationConnectionsModalConnection[];
    onClose: () => void;
    onRevoked?: (revoked: RevokedApplicationConnection[]) => void;
}
export declare const RevokeApplicationConnectionsModal: ({ connections, onClose, onRevoked, }: RevokeApplicationConnectionsModalProps) => React.JSX.Element | null;
