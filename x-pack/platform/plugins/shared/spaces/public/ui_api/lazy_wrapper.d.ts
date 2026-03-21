import type { FC, PropsWithChildren, PropsWithRef, ReactElement } from 'react';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { PluginsStart } from '../plugin';
interface InternalProps<T> {
    fn: () => Promise<FC<PropsWithChildren<T>>>;
    getStartServices: StartServicesAccessor<PluginsStart>;
    showLoadingSpinner?: boolean;
    props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>;
}
export declare const LazyWrapper: <T>(props: InternalProps<T>) => ReactElement | null;
export {};
