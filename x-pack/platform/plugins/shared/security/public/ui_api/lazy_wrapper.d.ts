import type { FC, PropsWithChildren, PropsWithRef, ReactElement } from 'react';
import type { CoreStart } from '@kbn/core/public';
interface InternalProps<T> {
    fn: () => Promise<FC<PropsWithChildren<T>>>;
    core: CoreStart;
    props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>;
}
export declare const LazyWrapper: <T>(props: InternalProps<T>) => ReactElement | null;
export {};
