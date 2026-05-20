import React from 'react';
import type { K8sMode } from './types';
interface Props {
    isK8s?: K8sMode;
    isManaged?: boolean;
}
export declare const InstallationMessage: React.FunctionComponent<Props>;
export {};
