import type { FunctionComponent } from 'react';
import type { InternalLegacyUrlAliasTarget } from './types';
import type { SpacesDataEntry } from '../../types';
interface Props {
    spaces: SpacesDataEntry[];
    aliasesToDisable: InternalLegacyUrlAliasTarget[];
}
export declare const AliasTable: FunctionComponent<Props>;
export {};
