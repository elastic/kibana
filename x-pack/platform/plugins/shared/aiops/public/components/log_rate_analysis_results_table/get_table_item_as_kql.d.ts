import { type SignificantItem } from '@kbn/ml-agg-utils';
import type { GroupTableItem } from '@kbn/aiops-log-rate-analysis/state';
export declare const getTableItemAsKQL: (tableItem: GroupTableItem | SignificantItem) => string;
