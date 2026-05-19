import { CaseStatuses } from '../../../common/types/domain';
import type { CaseUI } from '../../containers/types';
export declare const getStatusDate: (theCase: CaseUI) => string | null;
export declare const getStatusTitle: (status: CaseStatuses) => string;
