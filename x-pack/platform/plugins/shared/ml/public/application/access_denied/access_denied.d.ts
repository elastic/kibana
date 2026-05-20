import { type FC } from 'react';
import type { MlCapabilitiesKey } from '@kbn/ml-common-types/capabilities';
export interface AccessDeniedCalloutProps {
    missingCapabilities?: MlCapabilitiesKey[];
}
export declare const AccessDeniedCallout: FC<AccessDeniedCalloutProps>;
