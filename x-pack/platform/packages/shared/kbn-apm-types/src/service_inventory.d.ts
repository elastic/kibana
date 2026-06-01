import type { GroupedStatsResult } from '@kbn/slo-schema';
export type SloStatus = keyof GroupedStatsResult['summary'];
