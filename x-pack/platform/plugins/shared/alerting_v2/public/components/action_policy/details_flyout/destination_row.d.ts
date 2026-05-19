import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface Props {
    destination: ActionPolicyDestination;
}
export declare const DestinationRow: ({ destination }: Props) => React.JSX.Element | null;
export {};
