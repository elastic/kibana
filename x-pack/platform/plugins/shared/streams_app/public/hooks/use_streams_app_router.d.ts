import type { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import type { StreamsAppRouter, StreamsAppRoutes } from '../routes/config';
export interface StatefulStreamsAppRouter extends StreamsAppRouter {
    push<T extends PathsOf<StreamsAppRoutes>>(path: T, ...params: TypeAsArgs<TypeOf<StreamsAppRoutes, T>>): void;
    replace<T extends PathsOf<StreamsAppRoutes>>(path: T, ...params: TypeAsArgs<TypeOf<StreamsAppRoutes, T>>): void;
}
export declare function useStreamsAppRouter(): StatefulStreamsAppRouter;
