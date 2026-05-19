import type { MapAttributes } from '../../../../server';
import type { MapsAppState } from '../url_state';
export declare function getInitialQuery({ mapState, appState, }: {
    mapState?: MapAttributes;
    appState: MapsAppState;
}): Readonly<{} & {
    query: string | Record<string, any>;
    language: string;
}> | {
    query: string;
    language: any;
};
