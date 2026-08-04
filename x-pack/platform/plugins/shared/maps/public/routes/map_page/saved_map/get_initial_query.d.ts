import type { MapAttributes } from '../../../../server';
import type { MapsAppState } from '../url_state';
export declare function getInitialQuery({ mapState, appState, }: {
    mapState?: MapAttributes;
    appState: MapsAppState;
}): {
    query: string;
    language: any;
} | Readonly<{} & {
    query: string | Record<string, any>;
    language: string;
}>;
