import type { UIExtensionRegistrationCallback, UIExtensionsStorage } from '../types';
/** Factory that returns a callback that can be used to register UI extensions */
export declare const createExtensionRegistrationCallback: (storage: UIExtensionsStorage) => UIExtensionRegistrationCallback;
