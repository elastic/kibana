import React from 'react';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { PluginsStart } from '../../plugin';
import type { SpacesManager } from '../../spaces_manager';
import type { EmbeddableLegacyUrlConflictProps } from '../types';
export interface InternalProps {
    spacesManager: SpacesManager;
    getStartServices: StartServicesAccessor<PluginsStart>;
}
export declare const EmbeddableLegacyUrlConflictInternal: (props: InternalProps & EmbeddableLegacyUrlConflictProps) => React.JSX.Element | null;
