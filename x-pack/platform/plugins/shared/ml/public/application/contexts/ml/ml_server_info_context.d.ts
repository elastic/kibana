import React, { type FC, type PropsWithChildren } from 'react';
import type { NLPSettings } from '../../../../common/constants/app';
export interface MlServerInfoContextValue {
    nlpSettings: NLPSettings;
}
export declare const MlServerInfoContext: React.Context<MlServerInfoContextValue | undefined>;
export declare const MlServerInfoContextProvider: FC<PropsWithChildren<MlServerInfoContextValue>>;
export declare function useMlServerInfo(): MlServerInfoContextValue;
