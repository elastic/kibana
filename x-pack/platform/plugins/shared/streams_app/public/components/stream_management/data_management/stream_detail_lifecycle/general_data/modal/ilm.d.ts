import React from 'react';
import type { IlmPolicyPhases, IngestStreamLifecycleILM, IlmPolicy } from '@kbn/streams-schema';
import type { IngestStreamLifecycleAll } from '@kbn/streams-schema/src/models/ingest/lifecycle';
export interface PhaseProps {
    description: string;
    color: string;
}
interface ModalOptions {
    getIlmPolicies: () => Promise<IlmPolicy[]>;
    initialValue: IngestStreamLifecycleAll;
    setLifecycle: (lifecycle: IngestStreamLifecycleILM) => void;
    setSaveButtonDisabled: (isDisabled: boolean) => void;
    readOnly: boolean;
}
export declare function getPhaseDescription(phases: IlmPolicyPhases, phaseToIndicatorColors: {
    hot: string;
    warm: string;
    cold: string;
    frozen: string;
}): PhaseProps[];
export declare function IlmField({ getIlmPolicies, initialValue, setLifecycle, setSaveButtonDisabled, readOnly, }: ModalOptions): React.JSX.Element | undefined;
export {};
