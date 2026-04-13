import { type PathsOf, type TypeOf } from '@kbn/typed-react-router-config';
import type { StreamsAppRoutes } from '../routes/config';
export declare function useStreamsAppParams<TPath extends PathsOf<StreamsAppRoutes>>(path: TPath, optional?: boolean): TypeOf<StreamsAppRoutes, TPath>;
