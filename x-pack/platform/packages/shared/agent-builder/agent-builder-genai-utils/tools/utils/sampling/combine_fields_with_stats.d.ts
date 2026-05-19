import type { MappingField } from '../mappings';
import type { SamplingStats, FieldStats } from './create_stats_from_samples';
export type MappingFieldWithStats = MappingField & {
    stats: FieldStats;
};
export declare const combineFieldsWithStats: ({ fields, stats, }: {
    fields: MappingField[];
    stats: SamplingStats;
}) => MappingFieldWithStats[];
