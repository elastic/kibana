import type { AppDispatch, RemoteClustersState } from '../types';
export declare const removeClusters: (names: string[]) => (dispatch: AppDispatch, getState: () => RemoteClustersState) => Promise<void>;
