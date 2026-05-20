import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { AppStateManager } from './app_state_manager';
export declare function startAppStateSyncing(appStateManager: AppStateManager, kbnUrlStateStorage: IKbnUrlStateStorage): () => void;
