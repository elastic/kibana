import * as rt from 'io-ts';
export type SingleCaseMetricsRequest = rt.TypeOf<typeof SingleCaseMetricsRequestRt>;
export type SingleCaseMetricsResponse = rt.TypeOf<typeof SingleCaseMetricsResponseRt>;
export type CasesMetricsRequest = rt.TypeOf<typeof CasesMetricsRequestRt>;
export type CasesMetricsResponse = rt.TypeOf<typeof CasesMetricsResponseRt>;
export type AlertHostsMetrics = rt.TypeOf<typeof AlertHostsMetricsRt>;
export type AlertUsersMetrics = rt.TypeOf<typeof AlertUsersMetricsRt>;
export type StatusInfo = rt.TypeOf<typeof StatusInfoRt>;
export declare enum CaseMetricsFeature {
    ALERTS_COUNT = "alerts.count",
    ALERTS_USERS = "alerts.users",
    ALERTS_HOSTS = "alerts.hosts",
    ACTIONS_ISOLATE_HOST = "actions.isolateHost",
    CONNECTORS = "connectors",
    LIFESPAN = "lifespan",
    MTTR = "mttr",
    STATUS = "status"
}
export declare const SingleCaseMetricsFeatureFieldRt: rt.UnionC<[rt.LiteralC<CaseMetricsFeature.ALERTS_COUNT>, rt.LiteralC<CaseMetricsFeature.ALERTS_USERS>, rt.LiteralC<CaseMetricsFeature.ALERTS_HOSTS>, rt.LiteralC<CaseMetricsFeature.ACTIONS_ISOLATE_HOST>, rt.LiteralC<CaseMetricsFeature.CONNECTORS>, rt.LiteralC<CaseMetricsFeature.LIFESPAN>]>;
export declare const CasesMetricsFeatureFieldRt: rt.UnionC<[rt.UnionC<[rt.LiteralC<CaseMetricsFeature.ALERTS_COUNT>, rt.LiteralC<CaseMetricsFeature.ALERTS_USERS>, rt.LiteralC<CaseMetricsFeature.ALERTS_HOSTS>, rt.LiteralC<CaseMetricsFeature.ACTIONS_ISOLATE_HOST>, rt.LiteralC<CaseMetricsFeature.CONNECTORS>, rt.LiteralC<CaseMetricsFeature.LIFESPAN>]>, rt.LiteralC<CaseMetricsFeature.MTTR>, rt.LiteralC<CaseMetricsFeature.STATUS>]>;
declare const StatusInfoRt: rt.ExactC<rt.TypeC<{
    /**
     * Duration the case was in the open status in milliseconds
     */
    openDuration: rt.NumberC;
    /**
     * Duration the case was in the in-progress status in milliseconds. Zero indicates the case was never in-progress.
     */
    inProgressDuration: rt.NumberC;
    /**
     * The ISO string representation of the dates the case was reopened
     */
    reopenDates: rt.ArrayC<rt.StringC>;
}>>;
declare const AlertHostsMetricsRt: rt.ExactC<rt.TypeC<{
    /**
     * Total unique hosts represented in the alerts
     */
    total: rt.NumberC;
    values: rt.ArrayC<rt.ExactC<rt.TypeC<{
        /**
         * Host name
         */
        name: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
        /**
         * Unique identifier for the host
         */
        id: rt.StringC;
        /**
         * Number of alerts that have this particular host name
         */
        count: rt.NumberC;
    }>>>;
}>>;
declare const AlertUsersMetricsRt: rt.ExactC<rt.TypeC<{
    /**
     * Total unique users represented in the alerts
     */
    total: rt.NumberC;
    values: rt.ArrayC<rt.ExactC<rt.TypeC<{
        /**
         * Username
         */
        name: rt.StringC;
        /**
         * Number of alerts that have this particular username
         */
        count: rt.NumberC;
    }>>>;
}>>;
export declare const SingleCaseMetricsRequestRt: rt.ExactC<rt.TypeC<{
    /**
     * The metrics to retrieve.
     */
    features: rt.ArrayC<rt.UnionC<[rt.LiteralC<CaseMetricsFeature.ALERTS_COUNT>, rt.LiteralC<CaseMetricsFeature.ALERTS_USERS>, rt.LiteralC<CaseMetricsFeature.ALERTS_HOSTS>, rt.LiteralC<CaseMetricsFeature.ACTIONS_ISOLATE_HOST>, rt.LiteralC<CaseMetricsFeature.CONNECTORS>, rt.LiteralC<CaseMetricsFeature.LIFESPAN>]>>;
}>>;
export declare const CasesMetricsRequestRt: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    /**
     * The metrics to retrieve.
     */
    features: rt.ArrayC<rt.UnionC<[rt.UnionC<[rt.LiteralC<CaseMetricsFeature.ALERTS_COUNT>, rt.LiteralC<CaseMetricsFeature.ALERTS_USERS>, rt.LiteralC<CaseMetricsFeature.ALERTS_HOSTS>, rt.LiteralC<CaseMetricsFeature.ACTIONS_ISOLATE_HOST>, rt.LiteralC<CaseMetricsFeature.CONNECTORS>, rt.LiteralC<CaseMetricsFeature.LIFESPAN>]>, rt.LiteralC<CaseMetricsFeature.MTTR>, rt.LiteralC<CaseMetricsFeature.STATUS>]>>;
}>>, rt.ExactC<rt.PartialC<{
    /**
     * A KQL date. If used all cases created after (gte) the from date will be returned
     */
    from: rt.StringC;
    /**
     * A KQL date. If used all cases created before (lte) the to date will be returned.
     */
    to: rt.StringC;
    /**
     * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
     * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
     * that the user has access to.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
}>>]>;
export declare const SingleCaseMetricsResponseRt: rt.ExactC<rt.PartialC<{
    alerts: rt.ExactC<rt.PartialC<{
        /**
         * Number of alerts attached to the case
         */
        count: rt.NumberC;
        /**
         * Host information represented from the alerts attached to this case
         */
        hosts: rt.ExactC<rt.TypeC<{
            /**
             * Total unique hosts represented in the alerts
             */
            total: rt.NumberC;
            values: rt.ArrayC<rt.ExactC<rt.TypeC<{
                /**
                 * Host name
                 */
                name: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
                /**
                 * Unique identifier for the host
                 */
                id: rt.StringC;
                /**
                 * Number of alerts that have this particular host name
                 */
                count: rt.NumberC;
            }>>>;
        }>>;
        /**
         * User information represented from the alerts attached to this case
         */
        users: rt.ExactC<rt.TypeC<{
            /**
             * Total unique users represented in the alerts
             */
            total: rt.NumberC;
            values: rt.ArrayC<rt.ExactC<rt.TypeC<{
                /**
                 * Username
                 */
                name: rt.StringC;
                /**
                 * Number of alerts that have this particular username
                 */
                count: rt.NumberC;
            }>>>;
        }>>;
    }>>;
    /**
     * External connectors associated with the case
     */
    connectors: rt.ExactC<rt.TypeC<{
        /**
         * Total number of connectors in the case
         */
        total: rt.NumberC;
    }>>;
    /**
     * Actions taken within the case
     */
    actions: rt.ExactC<rt.PartialC<{
        isolateHost: rt.ExactC<rt.TypeC<{
            /**
             * Isolate host action information
             */
            isolate: rt.ExactC<rt.TypeC<{
                /**
                 * Total times the isolate host action has been performed
                 */
                total: rt.NumberC;
            }>>;
            /**
             * Unisolate host action information
             */
            unisolate: rt.ExactC<rt.TypeC<{
                /**
                 * Total times the unisolate host action has been performed
                 */
                total: rt.NumberC;
            }>>;
        }>>;
    }>>;
    /**
     * The case's open,close,in-progress details
     */
    lifespan: rt.ExactC<rt.TypeC<{
        /**
         * Date the case was created, in ISO format
         */
        creationDate: rt.StringC;
        /**
         * Date the case was closed, in ISO format. Will be null if the case is not currently closed
         */
        closeDate: rt.UnionC<[rt.StringC, rt.NullC]>;
        /**
         * The case's status information regarding durations in a specific status
         */
        statusInfo: rt.ExactC<rt.TypeC<{
            /**
             * Duration the case was in the open status in milliseconds
             */
            openDuration: rt.NumberC;
            /**
             * Duration the case was in the in-progress status in milliseconds. Zero indicates the case was never in-progress.
             */
            inProgressDuration: rt.NumberC;
            /**
             * The ISO string representation of the dates the case was reopened
             */
            reopenDates: rt.ArrayC<rt.StringC>;
        }>>;
    }>>;
}>>;
export declare const CasesMetricsResponseRt: rt.ExactC<rt.PartialC<{
    /**
     * The average resolve time of all cases in seconds
     */
    mttr: rt.UnionC<[rt.NumberC, rt.NullC]>;
    /**
     * The number of total cases per status
     */
    status: rt.ExactC<rt.TypeC<{
        open: rt.NumberC;
        inProgress: rt.NumberC;
        closed: rt.NumberC;
    }>>;
}>>;
export type CasesMetricsFeatureField = rt.TypeOf<typeof CasesMetricsFeatureFieldRt>;
export type SingleCaseMetricsFeatureField = rt.TypeOf<typeof SingleCaseMetricsFeatureFieldRt>;
export {};
