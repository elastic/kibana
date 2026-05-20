import { type CombinedState, type PreloadedState, type StoreEnhancer } from 'redux';
import type { LicenseManagementState, ThunkServices } from './types';
declare global {
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
    }
}
export declare const licenseManagementStore: (initialState: PreloadedState<CombinedState<LicenseManagementState>>, services: ThunkServices) => import("redux").Store<import("redux").EmptyObject & {
    license: import("@kbn/licensing-types").ILicense | null;
    uploadStatus: import("./types").UploadStatusState;
    uploadErrorMessage: string;
    trialStatus: import("./types").TrialStatusState;
    startBasicStatus: import("./types").StartBasicStatusState;
    permissions: import("./types").PermissionsState;
}, import("redux-actions").Action<import("@kbn/licensing-types").ILicense> | import("redux-actions").Action<import("./types").UploadStatusState> | import("redux-actions").Action<import("./types").StartBasicStatusState> | import("redux-actions").Action<string> | import("redux-actions").Action<boolean> | import("redux-actions").Action<unknown>> & {
    dispatch: import("redux-thunk").ThunkDispatch<any, ThunkServices, import("redux").AnyAction>;
};
export type AppStore = ReturnType<typeof licenseManagementStore>;
