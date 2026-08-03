import React from 'react';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { PluginsStart } from '../../plugin';
import type { LegacyUrlConflictProps } from '../types';
export interface InternalProps {
    getStartServices: StartServicesAccessor<PluginsStart>;
}
export declare const LegacyUrlConflictInternal: (props: InternalProps & LegacyUrlConflictProps) => React.JSX.Element | null;
