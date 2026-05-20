import React from 'react';
import type { FleetConfigType } from '../plugin';
export declare const ConfigContext: React.Context<FleetConfigType | null>;
export declare function useConfig(): FleetConfigType;
