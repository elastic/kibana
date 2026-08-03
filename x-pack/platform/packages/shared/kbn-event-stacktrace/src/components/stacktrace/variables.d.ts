import React from 'react';
import type { Stackframe } from '@kbn/apm-types';
interface Props {
    vars: Stackframe['vars'];
}
export declare function Variables({ vars }: Props): React.JSX.Element | null;
export {};
