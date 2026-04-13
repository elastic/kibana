export declare function useRequestPreviewFlyoutState(): {
    isRequestPreviewFlyoutOpen: boolean;
    requestPreviewFlyoutCodeContent: string;
    openRequestPreviewFlyout: ({ method, url, body }: {
        method: string;
        url: string;
        body: unknown;
    }) => void;
    closeRequestPreviewFlyout: () => void;
};
