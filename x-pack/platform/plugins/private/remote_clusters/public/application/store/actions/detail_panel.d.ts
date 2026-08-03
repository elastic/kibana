import type { AppDispatch } from '../types';
export declare const openDetailPanel: ({ name }: {
    name: string;
}) => (dispatch: AppDispatch) => void;
export declare const closeDetailPanel: () => (dispatch: AppDispatch) => void;
