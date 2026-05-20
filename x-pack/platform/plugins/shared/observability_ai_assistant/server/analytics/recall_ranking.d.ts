import type { EventTypeOpts } from '@kbn/core/server';
import { type Connector, type Scope } from '../../common/analytics';
interface ScoredDocument extends Connector, Scope {
    esScore: number;
    llmScore: number;
}
export interface RecallRanking {
    scoredDocuments: ScoredDocument[];
}
export declare const recallRankingEventType = "observability_ai_assistant_recall_ranking";
export declare const recallRankingEvent: EventTypeOpts<RecallRanking>;
export {};
