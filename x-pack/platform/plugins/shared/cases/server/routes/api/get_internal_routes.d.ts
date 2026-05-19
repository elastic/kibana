import type { UserProfileService } from '../../services';
import type { CaseRoute } from './types';
import type { ConfigType } from '../../config';
export declare const getInternalRoutes: (userProfileService: UserProfileService, config: ConfigType) => CaseRoute[];
