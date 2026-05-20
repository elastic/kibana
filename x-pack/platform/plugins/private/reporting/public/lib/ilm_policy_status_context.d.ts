import type { FC, PropsWithChildren } from 'react';
import type { IlmPolicyStatusResponse } from '@kbn/reporting-common/types';
import type { useCheckIlmPolicyStatus } from '@kbn/reporting-public';
type UseCheckIlmPolicyStatus = ReturnType<typeof useCheckIlmPolicyStatus>;
interface ContextValue {
    status: undefined | IlmPolicyStatusResponse['status'];
    isLoading: UseCheckIlmPolicyStatus['isLoading'];
    recheckStatus: UseCheckIlmPolicyStatus['resendRequest'];
}
export declare const IlmPolicyStatusContextProvider: FC<PropsWithChildren<unknown>>;
export type UseIlmPolicyStatusReturn = ReturnType<typeof useIlmPolicyStatus>;
export declare const useIlmPolicyStatus: () => ContextValue;
export {};
