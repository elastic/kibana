import type { TypedLensSerializedState } from '@kbn/lens-common';
export declare const useESQLVariables: ({ parentApi, attributes, panelId, closeFlyout, }: {
    parentApi: unknown;
    attributes?: TypedLensSerializedState["attributes"];
    panelId?: string;
    closeFlyout?: () => void;
}) => {
    onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
    onCancelControl: () => void;
};
