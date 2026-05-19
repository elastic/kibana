import type { estypes } from '@elastic/elasticsearch';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { STATUS_VALUES } from '@kbn/rule-data-utils';
import type { AggregateName, AggregationsAggregate, MappingRuntimeFields, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { RuleTypeParams, AlertingServerStart, AlertingAuthorization } from '@kbn/alerting-plugin/server';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type { RuleTypeRegistry } from '@kbn/alerting-plugin/server/types';
import type { TypeOf } from 'io-ts';
import type { GetBrowserFieldsResponse } from '@kbn/alerting-types';
import type { IRuleDataService } from '../rule_data_plugin_service';
import type { alertsAggregationsSchema } from '../../common/types';
import type { GetAlertFieldsResponseV1 } from '../routes/get_alert_fields';
import type { BulkUpdateApiResponse } from '../lib/transform_update_by_query_response';
export interface ConstructorOptions {
    logger: Logger;
    authorization: PublicMethodsOf<AlertingAuthorization>;
    auditLogger?: AuditLogger;
    esClient: ElasticsearchClient;
    esClientScoped: ElasticsearchClient;
    ruleDataService: IRuleDataService;
    getRuleType: RuleTypeRegistry['get'];
    getRuleList: RuleTypeRegistry['list'];
    getAlertIndicesAlias: AlertingServerStart['getAlertIndicesAlias'];
}
export interface UpdateOptions<Params extends RuleTypeParams> {
    id: string;
    status: string;
    _version?: string;
    index: string;
}
export interface BulkUpdateTagArgs {
    alertIds?: string[] | null;
    add?: string[] | null;
    remove?: string[] | null;
    index: string;
    query?: string | null;
}
export interface BulkUpdateOptions<Params extends RuleTypeParams> {
    ids?: string[] | null;
    status: STATUS_VALUES;
    index: string;
    query?: object | string | null;
}
interface MgetAndAuditAlert {
    id: string;
    index: string;
}
export interface BulkUpdateCasesOptions {
    alerts: MgetAndAuditAlert[];
    caseIds: string[];
}
export interface RemoveCaseIdFromAlertsOptions {
    alerts: MgetAndAuditAlert[];
    caseId: string;
}
interface GetAlertParams {
    id: string;
    index?: string;
}
interface GetAlertSummaryParams {
    id?: string;
    gte: string;
    lte: string;
    ruleTypeIds: string[];
    consumers?: string[];
    filter?: estypes.QueryDslQueryContainer[];
    fixedInterval?: string;
}
/**
 * Provides apis to interact with alerts as data
 * ensures the request is authorized to perform read / write actions
 * on alerts as data.
 */
export declare class AlertsClient {
    private readonly logger;
    private readonly auditLogger?;
    private readonly authorization;
    private readonly esClient;
    private readonly esClientScoped;
    private readonly spaceId;
    private readonly ruleDataService;
    private readonly getRuleList;
    private getAlertIndicesAlias;
    constructor(options: ConstructorOptions);
    private getOutcome;
    private getAlertStatusFieldUpdate;
    private getAlertCaseIdsFieldUpdate;
    private validateTotalCasesPerAlert;
    /**
     * Accepts an array of ES documents and executes ensureAuthorized for the given operation
     */
    private ensureAllAuthorized;
    /**
     * Searches alerts by id or query and audits the results
     */
    private searchAlerts;
    /**
     * When an update by ids is requested, do a multi-get, ensure authz and audit alerts, then execute bulk update
     */
    private mgetAlertsAuditOperate;
    /**
     * When an update by ids is requested, do a multi-get, ensure authz and audit alerts, then execute bulk update
     */
    private mgetAlertsAuditOperateStatus;
    private buildEsQueryWithAuthz;
    /**
     * Executes a search after to find alerts with query (+ authz filter)
     */
    private queryAndAuditAllAlerts;
    /**
     * Ensures that the user has access to the alerts
     * for a given operation
     */
    private ensureAllAlertsAuthorized;
    ensureAllAlertsAuthorizedRead({ alerts }: {
        alerts: MgetAndAuditAlert[];
    }): Promise<void>;
    get({ id, index }: GetAlertParams): Promise<{
        _index: string;
        "@timestamp"?: string | undefined;
        "kibana.space_ids"?: string[] | undefined;
        "kibana.alert.instance.id"?: string | undefined;
        "kibana.alert.status"?: string | undefined;
        "kibana.alert.uuid"?: string | undefined;
        "kibana.alert.rule.category"?: string | undefined;
        "kibana.alert.rule.consumer"?: string | undefined;
        "kibana.alert.rule.name"?: string | undefined;
        "kibana.alert.rule.producer"?: string | undefined;
        "kibana.alert.rule.revision"?: number | undefined;
        "kibana.alert.rule.rule_type_id"?: string | undefined;
        "kibana.alert.rule.uuid"?: string | undefined;
        tags?: string[] | undefined;
        "kibana.alert.state"?: unknown;
        "kibana.cps_scope.expression"?: string | undefined;
        "kibana.cps_scope.linked_projects"?: {
            [key: string]: unknown;
        }[] | undefined;
        "kibana.version"?: string | undefined;
        "kibana.alert.action_group"?: string | undefined;
        "kibana.alert.previous_action_group"?: string | undefined;
        "kibana.alert.severity_improving"?: boolean | undefined;
        "kibana.alert.case_ids"?: string[] | undefined;
        "kibana.alert.duration.us"?: number | undefined;
        "kibana.alert.end"?: string | undefined;
        "kibana.alert.flapping"?: boolean | undefined;
        "kibana.alert.flapping_history"?: boolean[] | undefined;
        "kibana.alert.maintenance_window_ids"?: string[] | undefined;
        "kibana.alert.maintenance_window_names"?: string[] | undefined;
        "kibana.alert.consecutive_matches"?: number | undefined;
        "kibana.alert.pending_recovered_count"?: number | undefined;
        "kibana.alert.last_detected"?: string | undefined;
        "kibana.alert.intended_timestamp"?: string | undefined;
        "kibana.alert.reason"?: string | undefined;
        "kibana.alert.start"?: string | undefined;
        "kibana.alert.updated_at"?: string | undefined;
        "kibana.alert.updated_by.user.id"?: string | undefined;
        "kibana.alert.updated_by.user.name"?: string | undefined;
        "kibana.alert.severity"?: string | undefined;
        "kibana.alert.time_range"?: unknown;
        "kibana.alert.workflow_status"?: string | undefined;
        "kibana.alert.workflow_tags"?: string[] | undefined;
        "kibana.alert.workflow_assignee_ids"?: string[] | undefined;
        "kibana.alert.rule.execution.timestamp"?: string | undefined;
        "kibana.alert.rule.execution.uuid"?: string | undefined;
        "kibana.alert.rule.parameters"?: {
            [key: string]: unknown;
        } | undefined;
        "kibana.alert.rule.tags"?: string[] | undefined;
        "kibana.alert.url"?: string | undefined;
        "kibana.alert.rule.execution.type"?: string | undefined;
        "kibana.alert.scheduled_action.group"?: string | undefined;
        "kibana.alert.scheduled_action.date"?: string | undefined;
        "kibana.alert.scheduled_action.throttling"?: unknown;
        "kibana.alert.index_pattern"?: string | undefined;
        "kibana.alert.muted"?: boolean | undefined;
        "ecs.version"?: string | undefined;
        "event.action"?: string | undefined;
        "event.kind"?: string | undefined;
        "event.original"?: string | undefined;
        "kibana.alert.risk_score"?: number | undefined;
        "kibana.alert.rule.author"?: string | undefined;
        "kibana.alert.rule.created_at"?: string | undefined;
        "kibana.alert.rule.created_by"?: string | undefined;
        "kibana.alert.rule.description"?: string | undefined;
        "kibana.alert.rule.enabled"?: string | undefined;
        "kibana.alert.rule.from"?: string | undefined;
        "kibana.alert.rule.interval"?: string | undefined;
        "kibana.alert.rule.license"?: string | undefined;
        "kibana.alert.rule.note"?: string | undefined;
        "kibana.alert.rule.references"?: string[] | undefined;
        "kibana.alert.rule.rule_id"?: string | undefined;
        "kibana.alert.rule.rule_name_override"?: string | undefined;
        "kibana.alert.rule.to"?: string | undefined;
        "kibana.alert.rule.type"?: string | undefined;
        "kibana.alert.rule.updated_at"?: string | undefined;
        "kibana.alert.rule.updated_by"?: string | undefined;
        "kibana.alert.rule.version"?: string | undefined;
        "kibana.alert.suppression.terms.field"?: string[] | undefined;
        "kibana.alert.suppression.terms.value"?: string[] | undefined;
        "kibana.alert.suppression.start"?: string | undefined;
        "kibana.alert.suppression.end"?: string | undefined;
        "kibana.alert.suppression.docs_count"?: number | undefined;
        "kibana.alert.system_status"?: string | undefined;
        "kibana.alert.workflow_reason"?: string | undefined;
        "kibana.alert.workflow_user"?: string | undefined;
        "kibana.alert.workflow_status_updated_at"?: string | undefined;
        "data_stream.dataset"?: string | undefined;
        "data_stream.namespace"?: string | undefined;
        "data_stream.type"?: string | undefined;
    }>;
    getAlertSummary({ gte, lte, ruleTypeIds, consumers, filter, fixedInterval, }: GetAlertSummaryParams): Promise<{
        activeAlertCount: number;
        recoveredAlertCount: number;
        activeAlerts: estypes.AggregationsBuckets<estypes.AggregationsDateHistogramBucket>;
        recoveredAlerts: estypes.AggregationsBuckets<estypes.AggregationsDateHistogramBucket>;
    }>;
    update<Params extends RuleTypeParams = never>({ id, status, _version, index, }: UpdateOptions<Params>): Promise<{
        _version: string | undefined;
        get?: estypes.InlineGet<unknown> | undefined;
        _id: estypes.Id;
        _index: estypes.IndexName;
        _primary_term?: estypes.long;
        result: estypes.Result;
        _seq_no?: estypes.SequenceNumber;
        _shards: estypes.ShardStatistics;
        failure_store?: estypes.BulkFailureStoreStatus;
        forced_refresh?: boolean;
    }>;
    bulkUpdate<Params extends RuleTypeParams = never>({ ids, query, index, status, }: BulkUpdateOptions<Params>): Promise<estypes.UpdateByQueryResponse | estypes.BulkResponse>;
    bulkUpdateTags({ alertIds, query, index, add, remove, }: BulkUpdateTagArgs): Promise<BulkUpdateApiResponse>;
    private bulkUpdateTagsByIds;
    private bulkUpdateTagsByQuery;
    private ensureAllAlertsAuthorizedByAggs;
    private getAuthorizedRuleTypeIdsConsumersPairs;
    private parseRuleTypeIdsConsumersAggsResponse;
    /**
     * Rule type id and consumers pairs should always have at least one entry
     * In the rare scenario where the alert documents do not have the info needed
     * to perform authorization, we throw a forbidden error
     */
    private validateRuleTypeIdConsumersPairs;
    private bulkEnsureAuthorizedAndAuditLog;
    /**
     * This function updates the case ids of multiple alerts per index.
     * It is supposed to be used only by Cases.
     * Cases implements its own RBAC. By using this function directly
     * Cases RBAC is bypassed.
     * Plugins that want to attach alerts to a case should use the
     * cases client that does all the necessary cases RBAC checks
     * before updating the alert with the case ids.
     */
    bulkUpdateCases({ alerts, caseIds }: BulkUpdateCasesOptions): Promise<estypes.BulkResponse>;
    removeCaseIdFromAlerts({ caseId, alerts }: RemoveCaseIdFromAlertsOptions): Promise<void>;
    removeCaseIdsFromAllAlerts({ caseIds }: {
        caseIds: string[];
    }): Promise<void>;
    find<Params extends RuleTypeParams = never, TAggregations = Record<AggregateName, AggregationsAggregate>>({ aggs, ruleTypeIds, consumers, index, query, search_after: searchAfter, size, sort, track_total_hits: trackTotalHits, _source, runtimeMappings, }: {
        aggs?: object;
        ruleTypeIds?: string[];
        consumers?: string[];
        index?: string;
        query?: object;
        search_after?: Array<string | number>;
        size?: number;
        sort?: estypes.SortOptions[];
        track_total_hits?: boolean | number;
        _source?: string[] | false;
        runtimeMappings?: MappingRuntimeFields;
    }): Promise<estypes.SearchResponse<{
        readonly "@timestamp": string;
        readonly "kibana.space_ids": string[];
        readonly "kibana.alert.instance.id": string;
        readonly "kibana.alert.status": string;
        readonly "kibana.alert.uuid": string;
        readonly "kibana.alert.rule.category": string;
        readonly "kibana.alert.rule.consumer": string;
        readonly "kibana.alert.rule.name": string;
        readonly "kibana.alert.rule.producer": string;
        readonly "kibana.alert.rule.revision": number;
        readonly "kibana.alert.rule.rule_type_id": string;
        readonly "kibana.alert.rule.uuid": string;
        readonly tags?: string[] | undefined;
        readonly "kibana.alert.state"?: unknown;
        readonly "kibana.cps_scope.expression"?: string | undefined;
        readonly "kibana.cps_scope.linked_projects"?: {
            [key: string]: unknown;
        }[] | undefined;
        readonly "kibana.version"?: string | undefined;
        readonly "kibana.alert.action_group"?: string | undefined;
        readonly "kibana.alert.previous_action_group"?: string | undefined;
        readonly "kibana.alert.severity_improving"?: boolean | undefined;
        readonly "kibana.alert.case_ids"?: string[] | undefined;
        readonly "kibana.alert.duration.us"?: number | undefined;
        readonly "kibana.alert.end"?: string | undefined;
        readonly "kibana.alert.flapping"?: boolean | undefined;
        readonly "kibana.alert.flapping_history"?: boolean[] | undefined;
        readonly "kibana.alert.maintenance_window_ids"?: string[] | undefined;
        readonly "kibana.alert.maintenance_window_names"?: string[] | undefined;
        readonly "kibana.alert.consecutive_matches"?: number | undefined;
        readonly "kibana.alert.pending_recovered_count"?: number | undefined;
        readonly "kibana.alert.last_detected"?: string | undefined;
        readonly "kibana.alert.intended_timestamp"?: string | undefined;
        readonly "kibana.alert.reason"?: string | undefined;
        readonly "kibana.alert.start"?: string | undefined;
        readonly "kibana.alert.updated_at"?: string | undefined;
        readonly "kibana.alert.updated_by.user.id"?: string | undefined;
        readonly "kibana.alert.updated_by.user.name"?: string | undefined;
        readonly "kibana.alert.severity"?: string | undefined;
        readonly "kibana.alert.time_range"?: unknown;
        readonly "kibana.alert.workflow_status"?: string | undefined;
        readonly "kibana.alert.workflow_tags"?: string[] | undefined;
        readonly "kibana.alert.workflow_assignee_ids"?: string[] | undefined;
        readonly "kibana.alert.rule.execution.timestamp"?: string | undefined;
        readonly "kibana.alert.rule.execution.uuid"?: string | undefined;
        readonly "kibana.alert.rule.parameters"?: {
            [key: string]: unknown;
        } | undefined;
        readonly "kibana.alert.rule.tags"?: string[] | undefined;
        readonly "kibana.alert.url"?: string | undefined;
        readonly "kibana.alert.rule.execution.type"?: string | undefined;
        readonly "kibana.alert.scheduled_action.group"?: string | undefined;
        readonly "kibana.alert.scheduled_action.date"?: string | undefined;
        readonly "kibana.alert.scheduled_action.throttling"?: unknown;
        readonly "kibana.alert.index_pattern"?: string | undefined;
        readonly "kibana.alert.muted"?: boolean | undefined;
        readonly "ecs.version"?: string | undefined;
        readonly "event.action"?: string | undefined;
        readonly "event.kind"?: string | undefined;
        readonly "event.original"?: string | undefined;
        readonly "kibana.alert.risk_score"?: number | undefined;
        readonly "kibana.alert.rule.author"?: string | undefined;
        readonly "kibana.alert.rule.created_at"?: string | undefined;
        readonly "kibana.alert.rule.created_by"?: string | undefined;
        readonly "kibana.alert.rule.description"?: string | undefined;
        readonly "kibana.alert.rule.enabled"?: string | undefined;
        readonly "kibana.alert.rule.from"?: string | undefined;
        readonly "kibana.alert.rule.interval"?: string | undefined;
        readonly "kibana.alert.rule.license"?: string | undefined;
        readonly "kibana.alert.rule.note"?: string | undefined;
        readonly "kibana.alert.rule.references"?: string[] | undefined;
        readonly "kibana.alert.rule.rule_id"?: string | undefined;
        readonly "kibana.alert.rule.rule_name_override"?: string | undefined;
        readonly "kibana.alert.rule.to"?: string | undefined;
        readonly "kibana.alert.rule.type"?: string | undefined;
        readonly "kibana.alert.rule.updated_at"?: string | undefined;
        readonly "kibana.alert.rule.updated_by"?: string | undefined;
        readonly "kibana.alert.rule.version"?: string | undefined;
        readonly "kibana.alert.suppression.terms.field"?: string[] | undefined;
        readonly "kibana.alert.suppression.terms.value"?: string[] | undefined;
        readonly "kibana.alert.suppression.start"?: string | undefined;
        readonly "kibana.alert.suppression.end"?: string | undefined;
        readonly "kibana.alert.suppression.docs_count"?: number | undefined;
        readonly "kibana.alert.system_status"?: string | undefined;
        readonly "kibana.alert.workflow_reason"?: string | undefined;
        readonly "kibana.alert.workflow_user"?: string | undefined;
        readonly "kibana.alert.workflow_status_updated_at"?: string | undefined;
        readonly "data_stream.dataset"?: string | undefined;
        readonly "data_stream.namespace"?: string | undefined;
        readonly "data_stream.type"?: string | undefined;
    }, TAggregations>>;
    /**
     * Performs a `find` query to extract aggregations on alert groups
     */
    getGroupAggregations({ ruleTypeIds, consumers, groupByField, aggregations, filters, pageIndex, pageSize, sort, }: {
        /**
         * The rule type IDs the alerts belong to.
         * Used for filtering.
         */
        ruleTypeIds: string[];
        /**
         * The consumers the alerts belong to.
         * Used for filtering.
         */
        consumers?: string[];
        /**
         * The field to group by
         * @example "kibana.alert.rule.name"
         */
        groupByField: string;
        /**
         * The aggregations to perform on the groupByField buckets
         */
        aggregations?: TypeOf<typeof alertsAggregationsSchema>;
        /**
         * The filters to apply to the query
         */
        filters?: estypes.QueryDslQueryContainer[];
        /**
         * Any sort options to apply to the groupByField aggregations
         */
        sort?: SortCombinations[];
        /**
         * The page index to start from
         */
        pageIndex: number;
        /**
         * The page size
         */
        pageSize: number;
    }): Promise<estypes.SearchResponse<{
        readonly "@timestamp": string;
        readonly "kibana.space_ids": string[];
        readonly "kibana.alert.instance.id": string;
        readonly "kibana.alert.status": string;
        readonly "kibana.alert.uuid": string;
        readonly "kibana.alert.rule.category": string;
        readonly "kibana.alert.rule.consumer": string;
        readonly "kibana.alert.rule.name": string;
        readonly "kibana.alert.rule.producer": string;
        readonly "kibana.alert.rule.revision": number;
        readonly "kibana.alert.rule.rule_type_id": string;
        readonly "kibana.alert.rule.uuid": string;
        readonly tags?: string[] | undefined;
        readonly "kibana.alert.state"?: unknown;
        readonly "kibana.cps_scope.expression"?: string | undefined;
        readonly "kibana.cps_scope.linked_projects"?: {
            [key: string]: unknown;
        }[] | undefined;
        readonly "kibana.version"?: string | undefined;
        readonly "kibana.alert.action_group"?: string | undefined;
        readonly "kibana.alert.previous_action_group"?: string | undefined;
        readonly "kibana.alert.severity_improving"?: boolean | undefined;
        readonly "kibana.alert.case_ids"?: string[] | undefined;
        readonly "kibana.alert.duration.us"?: number | undefined;
        readonly "kibana.alert.end"?: string | undefined;
        readonly "kibana.alert.flapping"?: boolean | undefined;
        readonly "kibana.alert.flapping_history"?: boolean[] | undefined;
        readonly "kibana.alert.maintenance_window_ids"?: string[] | undefined;
        readonly "kibana.alert.maintenance_window_names"?: string[] | undefined;
        readonly "kibana.alert.consecutive_matches"?: number | undefined;
        readonly "kibana.alert.pending_recovered_count"?: number | undefined;
        readonly "kibana.alert.last_detected"?: string | undefined;
        readonly "kibana.alert.intended_timestamp"?: string | undefined;
        readonly "kibana.alert.reason"?: string | undefined;
        readonly "kibana.alert.start"?: string | undefined;
        readonly "kibana.alert.updated_at"?: string | undefined;
        readonly "kibana.alert.updated_by.user.id"?: string | undefined;
        readonly "kibana.alert.updated_by.user.name"?: string | undefined;
        readonly "kibana.alert.severity"?: string | undefined;
        readonly "kibana.alert.time_range"?: unknown;
        readonly "kibana.alert.workflow_status"?: string | undefined;
        readonly "kibana.alert.workflow_tags"?: string[] | undefined;
        readonly "kibana.alert.workflow_assignee_ids"?: string[] | undefined;
        readonly "kibana.alert.rule.execution.timestamp"?: string | undefined;
        readonly "kibana.alert.rule.execution.uuid"?: string | undefined;
        readonly "kibana.alert.rule.parameters"?: {
            [key: string]: unknown;
        } | undefined;
        readonly "kibana.alert.rule.tags"?: string[] | undefined;
        readonly "kibana.alert.url"?: string | undefined;
        readonly "kibana.alert.rule.execution.type"?: string | undefined;
        readonly "kibana.alert.scheduled_action.group"?: string | undefined;
        readonly "kibana.alert.scheduled_action.date"?: string | undefined;
        readonly "kibana.alert.scheduled_action.throttling"?: unknown;
        readonly "kibana.alert.index_pattern"?: string | undefined;
        readonly "kibana.alert.muted"?: boolean | undefined;
        readonly "ecs.version"?: string | undefined;
        readonly "event.action"?: string | undefined;
        readonly "event.kind"?: string | undefined;
        readonly "event.original"?: string | undefined;
        readonly "kibana.alert.risk_score"?: number | undefined;
        readonly "kibana.alert.rule.author"?: string | undefined;
        readonly "kibana.alert.rule.created_at"?: string | undefined;
        readonly "kibana.alert.rule.created_by"?: string | undefined;
        readonly "kibana.alert.rule.description"?: string | undefined;
        readonly "kibana.alert.rule.enabled"?: string | undefined;
        readonly "kibana.alert.rule.from"?: string | undefined;
        readonly "kibana.alert.rule.interval"?: string | undefined;
        readonly "kibana.alert.rule.license"?: string | undefined;
        readonly "kibana.alert.rule.note"?: string | undefined;
        readonly "kibana.alert.rule.references"?: string[] | undefined;
        readonly "kibana.alert.rule.rule_id"?: string | undefined;
        readonly "kibana.alert.rule.rule_name_override"?: string | undefined;
        readonly "kibana.alert.rule.to"?: string | undefined;
        readonly "kibana.alert.rule.type"?: string | undefined;
        readonly "kibana.alert.rule.updated_at"?: string | undefined;
        readonly "kibana.alert.rule.updated_by"?: string | undefined;
        readonly "kibana.alert.rule.version"?: string | undefined;
        readonly "kibana.alert.suppression.terms.field"?: string[] | undefined;
        readonly "kibana.alert.suppression.terms.value"?: string[] | undefined;
        readonly "kibana.alert.suppression.start"?: string | undefined;
        readonly "kibana.alert.suppression.end"?: string | undefined;
        readonly "kibana.alert.suppression.docs_count"?: number | undefined;
        readonly "kibana.alert.system_status"?: string | undefined;
        readonly "kibana.alert.workflow_reason"?: string | undefined;
        readonly "kibana.alert.workflow_user"?: string | undefined;
        readonly "kibana.alert.workflow_status_updated_at"?: string | undefined;
        readonly "data_stream.dataset"?: string | undefined;
        readonly "data_stream.namespace"?: string | undefined;
        readonly "data_stream.type"?: string | undefined;
    }, {
        groupByFields: estypes.AggregationsMultiBucketAggregateBase<{
            key: string;
        }>;
    }>>;
    getAuthorizedAlertsIndices(ruleTypeIds?: string[]): Promise<string[] | undefined>;
    getBrowserFields({ ruleTypeIds, indices, metaFields, allowNoIndex, includeEmptyFields, indexFilter, }: {
        ruleTypeIds: string[];
        indices: string[];
        metaFields: string[];
        allowNoIndex: boolean;
        includeEmptyFields: boolean;
        indexFilter?: estypes.QueryDslQueryContainer;
    }): Promise<GetBrowserFieldsResponse>;
    private getRuleTypeIds;
    getAlertFields(ruleTypeIds: string[]): Promise<GetAlertFieldsResponseV1>;
}
export {};
