import type { TransactionOptions } from '@elastic/apm-rum';
export type CasesApmTransactionName = `Cases [${string}] ${string}`;
interface StartTransactionOptions {
    type?: string;
    options?: TransactionOptions;
}
export declare const useStartTransaction: () => {
    startTransaction: (name: CasesApmTransactionName, { type, options, }?: StartTransactionOptions) => import("@elastic/apm-rum").Transaction | undefined;
};
export {};
