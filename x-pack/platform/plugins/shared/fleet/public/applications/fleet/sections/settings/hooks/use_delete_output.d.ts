import type { Output } from '../../../types';
export declare function useDeleteOutput(onSuccess: () => void): {
    deleteOutput: (output: Output) => Promise<void>;
};
