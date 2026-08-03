interface UseConsumeLensReturnArgs {
    caseId: string;
}
/**
 * Mount on the case view to auto-attach a Lens visualization when the user
 * returns from the Lens editor via "Save and return". Reads the pending
 * marker written by `useOpenLensForAttach`, claims the incoming embeddable
 * package, and creates the attachment with the current global timefilter as
 * the snapshot's view time range.
 */
export declare const useConsumeLensReturn: ({ caseId }: UseConsumeLensReturnArgs) => void;
export {};
