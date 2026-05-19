import type { Observable } from 'rxjs';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { MlFeatures } from '../../../common/constants/app';
export declare const setupCapabilitiesSwitcher: (coreSetup: CoreSetup, license$: Observable<ILicense>, enabledFeatures: MlFeatures, logger: Logger) => void;
