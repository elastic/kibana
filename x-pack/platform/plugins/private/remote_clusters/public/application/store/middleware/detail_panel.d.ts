import type { Dispatch } from 'redux-v4';
import type { RemoteClustersAction } from '../types';
export declare const detailPanel: () => (next: Dispatch<RemoteClustersAction>) => (action: RemoteClustersAction) => RemoteClustersAction;
