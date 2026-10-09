import type { RawAlertInstance, RuleAlertData } from '../../types';
import type { TrackedAADAlerts, SearchResult } from '../types';
export type TrackedAlertsSearch<AlertData extends RuleAlertData> = (queryBody: Record<string, unknown>) => Promise<SearchResult<AlertData>>;
export declare function createEmptyTrackedAlerts<AlertData extends RuleAlertData>(): TrackedAADAlerts<AlertData>;
export declare function fetchTrackedAlerts<AlertData extends RuleAlertData>({ ruleId, search, }: {
    ruleId: string;
    search: TrackedAlertsSearch<AlertData>;
}): Promise<SearchResult<AlertData>['hits']>;
export declare function fetchAlertsByIds<AlertData extends RuleAlertData>({ ruleId, alertUuids, search, }: {
    ruleId: string;
    alertUuids: string[];
    search: TrackedAlertsSearch<AlertData>;
}): Promise<SearchResult<AlertData>['hits']>;
export declare function populateTrackedAlerts<AlertData extends RuleAlertData>(trackedAlerts: TrackedAADAlerts<AlertData>, hits: SearchResult<AlertData>['hits']): void;
export declare function findMissingAlertUuids<AlertData extends RuleAlertData>(alertUuidsFromState: string[], trackedAlerts: TrackedAADAlerts<AlertData>): string[];
export declare function getAlertUuidsFromState(activeAlertsFromState: Record<string, RawAlertInstance>, recoveredAlertsFromState: Record<string, RawAlertInstance>): string[];
