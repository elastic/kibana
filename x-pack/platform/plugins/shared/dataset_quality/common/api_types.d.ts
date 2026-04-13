import * as rt from 'io-ts';
declare const datasetPrivilegeRt: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.TypeC<{
    canMonitor: rt.BooleanC;
    canReadFailureStore: rt.BooleanC;
    canManageFailureStore: rt.BooleanC;
}>, rt.TypeC<{
    canRead: rt.BooleanC;
}>]>>;
declare const datasetUserPrivilegesRt: rt.TypeC<{
    datasetsPrivilages: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.TypeC<{
        canMonitor: rt.BooleanC;
        canReadFailureStore: rt.BooleanC;
        canManageFailureStore: rt.BooleanC;
    }>, rt.TypeC<{
        canRead: rt.BooleanC;
    }>]>>;
    canViewIntegrations: rt.BooleanC;
}>;
export type DatasetUserPrivileges = rt.TypeOf<typeof datasetUserPrivilegesRt>;
export type DatasetTypesPrivileges = rt.TypeOf<typeof datasetPrivilegeRt>;
export declare const getDataStreamsTypesPrivilegesResponseRt: rt.ExactC<rt.TypeC<{
    datasetTypesPrivileges: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.TypeC<{
        canMonitor: rt.BooleanC;
        canReadFailureStore: rt.BooleanC;
        canManageFailureStore: rt.BooleanC;
    }>, rt.TypeC<{
        canRead: rt.BooleanC;
    }>]>>;
}>>;
export declare const dataStreamStatRt: rt.IntersectionC<[rt.TypeC<{
    name: rt.StringC;
    userPrivileges: rt.TypeC<{
        canMonitor: rt.BooleanC;
        canReadFailureStore: rt.BooleanC;
        canManageFailureStore: rt.BooleanC;
    }>;
}>, rt.PartialC<{
    size: rt.StringC;
    sizeBytes: rt.NumberC;
    lastActivity: rt.NumberC;
    integration: rt.StringC;
    totalDocs: rt.NumberC;
    creationDate: rt.NumberC;
    hasFailureStore: rt.BooleanC;
    customRetentionPeriod: rt.StringC;
    defaultRetentionPeriod: rt.StringC;
}>]>;
export type DataStreamStat = rt.TypeOf<typeof dataStreamStatRt>;
export declare const dataStreamDocsStatRt: rt.TypeC<{
    dataset: rt.StringC;
    count: rt.NumberC;
}>;
export type DataStreamDocsStat = rt.TypeOf<typeof dataStreamDocsStatRt>;
export declare const getDataStreamTotalDocsResponseRt: rt.TypeC<{
    totalDocs: rt.ArrayC<rt.TypeC<{
        dataset: rt.StringC;
        count: rt.NumberC;
    }>>;
}>;
export type DataStreamTotalDocsResponse = rt.TypeOf<typeof getDataStreamTotalDocsResponseRt>;
export declare const getDataStreamDegradedDocsResponseRt: rt.TypeC<{
    degradedDocs: rt.ArrayC<rt.TypeC<{
        dataset: rt.StringC;
        count: rt.NumberC;
    }>>;
}>;
export type DataStreamDegradedDocsResponse = rt.TypeOf<typeof getDataStreamDegradedDocsResponseRt>;
export declare const getDataStreamFailedDocsResponseRt: rt.TypeC<{
    failedDocs: rt.ArrayC<rt.TypeC<{
        dataset: rt.StringC;
        count: rt.NumberC;
    }>>;
}>;
export type DataStreamFailedDocsResponse = rt.TypeOf<typeof getDataStreamFailedDocsResponseRt>;
export declare const integrationDashboardRT: rt.TypeC<{
    id: rt.StringC;
    title: rt.StringC;
}>;
export type Dashboard = rt.TypeOf<typeof integrationDashboardRT>;
export declare const integrationDashboardsRT: rt.TypeC<{
    dashboards: rt.ArrayC<rt.TypeC<{
        id: rt.StringC;
        title: rt.StringC;
    }>>;
}>;
export type IntegrationDashboardsResponse = rt.TypeOf<typeof integrationDashboardsRT>;
export declare const integrationIconRt: rt.IntersectionC<[rt.TypeC<{
    src: rt.StringC;
}>, rt.PartialC<{
    path: rt.StringC;
    size: rt.StringC;
    title: rt.StringC;
    type: rt.StringC;
}>]>;
export declare const integrationRt: rt.IntersectionC<[rt.TypeC<{
    name: rt.StringC;
}>, rt.PartialC<{
    title: rt.StringC;
    version: rt.StringC;
    icons: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        src: rt.StringC;
    }>, rt.PartialC<{
        path: rt.StringC;
        size: rt.StringC;
        title: rt.StringC;
        type: rt.StringC;
    }>]>>;
    datasets: rt.RecordC<rt.StringC, rt.StringC>;
}>]>;
export type IntegrationType = rt.TypeOf<typeof integrationRt>;
export declare const checkAndLoadIntegrationResponseRt: rt.UnionC<[rt.TypeC<{
    isIntegration: rt.LiteralC<false>;
    areAssetsAvailable: rt.BooleanC;
}>, rt.TypeC<{
    isIntegration: rt.LiteralC<true>;
    areAssetsAvailable: rt.LiteralC<true>;
    integration: rt.IntersectionC<[rt.TypeC<{
        name: rt.StringC;
    }>, rt.PartialC<{
        title: rt.StringC;
        version: rt.StringC;
        icons: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            src: rt.StringC;
        }>, rt.PartialC<{
            path: rt.StringC;
            size: rt.StringC;
            title: rt.StringC;
            type: rt.StringC;
        }>]>>;
        datasets: rt.RecordC<rt.StringC, rt.StringC>;
    }>]>;
}>]>;
export type CheckAndLoadIntegrationResponse = rt.TypeOf<typeof checkAndLoadIntegrationResponseRt>;
export declare const getIntegrationsResponseRt: rt.ExactC<rt.TypeC<{
    integrations: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        name: rt.StringC;
    }>, rt.PartialC<{
        title: rt.StringC;
        version: rt.StringC;
        icons: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            src: rt.StringC;
        }>, rt.PartialC<{
            path: rt.StringC;
            size: rt.StringC;
            title: rt.StringC;
            type: rt.StringC;
        }>]>>;
        datasets: rt.RecordC<rt.StringC, rt.StringC>;
    }>]>>;
}>>;
export type IntegrationsResponse = rt.TypeOf<typeof getIntegrationsResponseRt>;
export declare const qualityIssueBaseRT: rt.TypeC<{
    count: rt.NumberC;
    lastOccurrence: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.NumberC]>;
    timeSeries: rt.ArrayC<rt.TypeC<{
        x: rt.NumberC;
        y: rt.NumberC;
    }>>;
}>;
export declare const qualityIssueRT: rt.IntersectionC<[rt.TypeC<{
    count: rt.NumberC;
    lastOccurrence: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.NumberC]>;
    timeSeries: rt.ArrayC<rt.TypeC<{
        x: rt.NumberC;
        y: rt.NumberC;
    }>>;
}>, rt.PartialC<{
    indexFieldWasLastPresentIn: rt.StringC;
}>, rt.TypeC<{
    name: rt.StringC;
    type: rt.KeyofC<{
        degraded: null;
        failed: null;
    }>;
}>]>;
export type QualityIssue = rt.TypeOf<typeof qualityIssueRT>;
export type FailedDocsDetails = rt.TypeOf<typeof qualityIssueBaseRT>;
export declare const failedDocsErrorRt: rt.TypeC<{
    message: rt.StringC;
    type: rt.StringC;
}>;
export type FailedDocsError = rt.TypeOf<typeof failedDocsErrorRt>;
export declare const failedDocsErrorsRt: rt.TypeC<{
    errors: rt.ArrayC<rt.TypeC<{
        message: rt.StringC;
        type: rt.StringC;
    }>>;
}>;
export type FailedDocsErrorsResponse = rt.TypeOf<typeof failedDocsErrorsRt>;
export declare const degradedFieldRt: rt.IntersectionC<[rt.TypeC<{
    count: rt.NumberC;
    lastOccurrence: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.NumberC]>;
    timeSeries: rt.ArrayC<rt.TypeC<{
        x: rt.NumberC;
        y: rt.NumberC;
    }>>;
}>, rt.TypeC<{
    name: rt.StringC;
    indexFieldWasLastPresentIn: rt.StringC;
}>]>;
export type DegradedField = rt.TypeOf<typeof degradedFieldRt>;
export declare const getDataStreamDegradedFieldsResponseRt: rt.TypeC<{
    degradedFields: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        count: rt.NumberC;
        lastOccurrence: rt.UnionC<[rt.UndefinedC, rt.NullC, rt.NumberC]>;
        timeSeries: rt.ArrayC<rt.TypeC<{
            x: rt.NumberC;
            y: rt.NumberC;
        }>>;
    }>, rt.TypeC<{
        name: rt.StringC;
        indexFieldWasLastPresentIn: rt.StringC;
    }>]>>;
}>;
export type DegradedFieldResponse = rt.TypeOf<typeof getDataStreamDegradedFieldsResponseRt>;
export declare const degradedFieldValuesRt: rt.TypeC<{
    field: rt.StringC;
    values: rt.ArrayC<rt.StringC>;
}>;
export type DegradedFieldValues = rt.TypeOf<typeof degradedFieldValuesRt>;
export declare const degradedFieldAnalysisRt: rt.IntersectionC<[rt.TypeC<{
    isFieldLimitIssue: rt.BooleanC;
    fieldCount: rt.NumberC;
    totalFieldLimit: rt.NumberC;
}>, rt.PartialC<{
    ignoreMalformed: rt.BooleanC;
    nestedFieldLimit: rt.NumberC;
    fieldMapping: rt.PartialC<{
        type: rt.StringC;
        ignore_above: rt.NumberC;
    }>;
    defaultPipeline: rt.StringC;
}>]>;
export type DegradedFieldAnalysis = rt.TypeOf<typeof degradedFieldAnalysisRt>;
export declare const updateFieldLimitResponseRt: rt.IntersectionC<[rt.TypeC<{
    isComponentTemplateUpdated: rt.UnionC<[rt.BooleanC, rt.UndefinedC]>;
    isLatestBackingIndexUpdated: rt.UnionC<[rt.BooleanC, rt.UndefinedC]>;
    customComponentTemplateName: rt.StringC;
}>, rt.PartialC<{
    error: rt.StringC;
}>]>;
export type UpdateFieldLimitResponse = rt.TypeOf<typeof updateFieldLimitResponseRt>;
export declare const dataStreamRolloverResponseRt: rt.TypeC<{
    acknowledged: rt.BooleanC;
}>;
export type DataStreamRolloverResponse = rt.TypeOf<typeof dataStreamRolloverResponseRt>;
export declare const dataStreamSettingsRt: rt.PartialC<{
    lastBackingIndexName: rt.StringC;
    indexTemplate: rt.StringC;
    createdOn: rt.UnionC<[rt.NullC, rt.NumberC]>;
    integration: rt.StringC;
    datasetUserPrivileges: rt.TypeC<{
        datasetsPrivilages: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.TypeC<{
            canMonitor: rt.BooleanC;
            canReadFailureStore: rt.BooleanC;
            canManageFailureStore: rt.BooleanC;
        }>, rt.TypeC<{
            canRead: rt.BooleanC;
        }>]>>;
        canViewIntegrations: rt.BooleanC;
    }>;
}>;
export type DataStreamSettings = rt.TypeOf<typeof dataStreamSettingsRt>;
export declare const dataStreamDetailsRt: rt.PartialC<{
    hasFailureStore: rt.BooleanC;
    lastActivity: rt.NumberC;
    degradedDocsCount: rt.NumberC;
    failedDocsCount: rt.NumberC;
    docsCount: rt.NumberC;
    sizeBytes: rt.NumberC;
    services: rt.RecordC<rt.StringC, rt.ArrayC<rt.StringC>>;
    hosts: rt.RecordC<rt.StringC, rt.ArrayC<rt.StringC>>;
    userPrivileges: rt.TypeC<{
        canMonitor: rt.BooleanC;
        canReadFailureStore: rt.BooleanC;
        canManageFailureStore: rt.BooleanC;
    }>;
    defaultRetentionPeriod: rt.StringC;
    customRetentionPeriod: rt.StringC;
    isServerless: rt.BooleanC;
}>;
export type DataStreamDetails = rt.TypeOf<typeof dataStreamDetailsRt>;
export declare const getDataStreamsStatsResponseRt: rt.ExactC<rt.TypeC<{
    datasetUserPrivileges: rt.TypeC<{
        datasetsPrivilages: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.TypeC<{
            canMonitor: rt.BooleanC;
            canReadFailureStore: rt.BooleanC;
            canManageFailureStore: rt.BooleanC;
        }>, rt.TypeC<{
            canRead: rt.BooleanC;
        }>]>>;
        canViewIntegrations: rt.BooleanC;
    }>;
    dataStreamsStats: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        name: rt.StringC;
        userPrivileges: rt.TypeC<{
            canMonitor: rt.BooleanC;
            canReadFailureStore: rt.BooleanC;
            canManageFailureStore: rt.BooleanC;
        }>;
    }>, rt.PartialC<{
        size: rt.StringC;
        sizeBytes: rt.NumberC;
        lastActivity: rt.NumberC;
        integration: rt.StringC;
        totalDocs: rt.NumberC;
        creationDate: rt.NumberC;
        hasFailureStore: rt.BooleanC;
        customRetentionPeriod: rt.StringC;
        defaultRetentionPeriod: rt.StringC;
    }>]>>;
}>>;
export declare const getDataStreamsSettingsResponseRt: rt.ExactC<rt.PartialC<{
    lastBackingIndexName: rt.StringC;
    indexTemplate: rt.StringC;
    createdOn: rt.UnionC<[rt.NullC, rt.NumberC]>;
    integration: rt.StringC;
    datasetUserPrivileges: rt.TypeC<{
        datasetsPrivilages: rt.RecordC<rt.StringC, rt.IntersectionC<[rt.TypeC<{
            canMonitor: rt.BooleanC;
            canReadFailureStore: rt.BooleanC;
            canManageFailureStore: rt.BooleanC;
        }>, rt.TypeC<{
            canRead: rt.BooleanC;
        }>]>>;
        canViewIntegrations: rt.BooleanC;
    }>;
}>>;
export declare const getDataStreamsDetailsResponseRt: rt.ExactC<rt.PartialC<{
    hasFailureStore: rt.BooleanC;
    lastActivity: rt.NumberC;
    degradedDocsCount: rt.NumberC;
    failedDocsCount: rt.NumberC;
    docsCount: rt.NumberC;
    sizeBytes: rt.NumberC;
    services: rt.RecordC<rt.StringC, rt.ArrayC<rt.StringC>>;
    hosts: rt.RecordC<rt.StringC, rt.ArrayC<rt.StringC>>;
    userPrivileges: rt.TypeC<{
        canMonitor: rt.BooleanC;
        canReadFailureStore: rt.BooleanC;
        canManageFailureStore: rt.BooleanC;
    }>;
    defaultRetentionPeriod: rt.StringC;
    customRetentionPeriod: rt.StringC;
    isServerless: rt.BooleanC;
}>>;
export declare const dataStreamsEstimatedDataInBytesRT: rt.TypeC<{
    estimatedDataInBytes: rt.NumberC;
}>;
export declare const getDataStreamsEstimatedDataInBytesResponseRt: rt.ExactC<rt.TypeC<{
    estimatedDataInBytes: rt.NumberC;
}>>;
export declare const getNonAggregatableDatasetsRt: rt.ExactC<rt.TypeC<{
    aggregatable: rt.BooleanC;
    datasets: rt.ArrayC<rt.StringC>;
}>>;
export type NonAggregatableDatasets = rt.TypeOf<typeof getNonAggregatableDatasetsRt>;
export declare const getPreviewChartResponseRt: rt.TypeC<{
    series: rt.ArrayC<rt.TypeC<{
        name: rt.StringC;
        data: rt.ArrayC<rt.TypeC<{
            x: rt.NumberC;
            y: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>;
    }>>;
    totalGroups: rt.NumberC;
}>;
export type PreviewChartResponse = rt.TypeOf<typeof getPreviewChartResponseRt>;
export declare const updateFailureStoreResponseRt: rt.TypeC<{
    headers: rt.RecordC<rt.StringC, rt.UnknownC>;
}>;
export type UpdateFailureStoreResponse = rt.TypeOf<typeof updateFailureStoreResponseRt>;
export {};
