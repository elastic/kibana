import type React from 'react';
import type { PathsOf, TypeOf } from '@kbn/typed-react-router-config';
import type { DeepPartial } from 'utility-types';
import type { StreamsAppRoutes } from '../../routes/config';
export declare function RedirectTo<TPath extends PathsOf<StreamsAppRoutes>, TParams extends TypeOf<StreamsAppRoutes, TPath, false>>({ children, path, params, }: React.PropsWithChildren<{
    path: TPath;
    params?: DeepPartial<TParams>;
}>): string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null;
