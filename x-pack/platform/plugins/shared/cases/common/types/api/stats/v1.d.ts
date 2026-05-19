import * as rt from 'io-ts';
export declare const CasesStatusResponseRt: rt.ExactC<rt.TypeC<{
    count_open_cases: rt.NumberC;
    count_in_progress_cases: rt.NumberC;
    count_closed_cases: rt.NumberC;
}>>;
export declare const CasesStatusRequestRt: rt.ExactC<rt.PartialC<{
    /**
     * A KQL date. If used all cases created after (gte) the from date will be returned
     */
    from: rt.StringC;
    /**
     * A KQL date. If used all cases created before (lte) the to date will be returned.
     */
    to: rt.StringC;
    /**
     * The owner of the cases to retrieve the status stats from. If no owner is provided the stats for all cases
     * that the user has access to will be returned.
     */
    owner: rt.UnionC<[rt.ArrayC<rt.StringC>, rt.StringC]>;
}>>;
export type CasesStatusResponse = rt.TypeOf<typeof CasesStatusResponseRt>;
export type CasesStatusRequest = rt.TypeOf<typeof CasesStatusRequestRt>;
