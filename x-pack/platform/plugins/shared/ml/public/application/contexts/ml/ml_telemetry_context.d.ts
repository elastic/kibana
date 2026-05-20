import React, { type FC, type PropsWithChildren } from 'react';
import type { ITelemetryClient } from '../../services/telemetry/types';
interface MlTelemetryClientContextValue {
    telemetryClient: ITelemetryClient;
}
export declare const MlTelemetryContext: React.Context<MlTelemetryClientContextValue | undefined>;
export declare const MlTelemetryContextProvider: FC<PropsWithChildren<MlTelemetryClientContextValue>>;
export declare function useMlTelemetryClient(): MlTelemetryClientContextValue;
export {};
