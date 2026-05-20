import type { TypedUseSelectorHook } from 'react-redux';
import type { AppDispatch, RootState } from './store';
export declare const useAppDispatch: () => AppDispatch;
export declare const useAppSelector: TypedUseSelectorHook<RootState>;
