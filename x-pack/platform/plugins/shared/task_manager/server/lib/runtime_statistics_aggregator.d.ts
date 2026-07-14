import type { Observable } from 'rxjs';
import type { JsonValue } from '@kbn/utility-types';
export interface AggregatedStat<Stat = JsonValue> {
    key: string;
    value: Stat;
}
export type AggregatedStatProvider<Stat extends JsonValue = JsonValue> = Observable<AggregatedStat<Stat>>;
