import type { DownloadSource } from '../../../../types';
export declare function useDeleteDownloadSource(onSuccess: () => void): {
    deleteDownloadSource: (downloadSource: DownloadSource) => Promise<void>;
};
