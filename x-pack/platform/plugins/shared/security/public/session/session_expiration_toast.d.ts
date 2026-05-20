import type { FunctionComponent } from 'react';
import type { Observable } from 'rxjs';
import type { ToastInput } from '@kbn/core/public';
import type { SessionState } from './session_timeout';
import type { StartServices } from '..';
export interface SessionExpirationToastProps {
    sessionState$: Observable<SessionState>;
}
export declare const SessionExpirationToast: FunctionComponent<SessionExpirationToastProps>;
export declare const createSessionExpirationToast: (services: StartServices, sessionState$: Observable<SessionState>, onClose: () => void) => ToastInput;
