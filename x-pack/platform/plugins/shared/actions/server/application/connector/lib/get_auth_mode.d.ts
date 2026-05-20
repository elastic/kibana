import type { AuthMode } from '@kbn/connector-specs';
import type { Connector } from '../types';
export declare function getAuthMode(authMode: Connector['authMode'] | undefined): AuthMode;
