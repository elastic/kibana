import type { Logger } from '@kbn/core/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import type { MlFeatures } from '../../common/constants/app';
export declare function registerCasesPersistableState(cases: CasesServerSetup, enabledFeatures: MlFeatures, logger: Logger): void;
