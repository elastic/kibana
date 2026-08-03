import React from 'react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
interface AccessFlyoutProps {
    agent: AgentDefinition;
    onClose: () => void;
}
export declare const AccessFlyout: React.FC<AccessFlyoutProps>;
export {};
