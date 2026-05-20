import type { ClientConfigType } from '@kbn/reporting-public';
import type { FC, PropsWithChildren } from 'react';
interface PolicyStatusContextProviderProps {
    config: ClientConfigType;
}
export declare const PolicyStatusContextProvider: FC<PropsWithChildren<PolicyStatusContextProviderProps>>;
export {};
