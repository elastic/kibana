import type { FunctionComponent } from 'react';
import type { Observable } from 'rxjs';
import type { SessionState } from './session_timeout';
import type { StartServices } from '..';
export interface SessionExpirationModalProps {
    sessionState$: Observable<SessionState>;
    onExtend: () => Promise<any>;
    onClose: () => void;
}
export declare const SessionExpirationModal: FunctionComponent<SessionExpirationModalProps>;
export declare const createSessionExpirationModal: (services: StartServices, sessionState$: Observable<SessionState>, onExtend: () => Promise<any>, onClose: () => void) => import("@kbn/core/public").MountPoint;
