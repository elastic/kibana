export function getEntitiesQuery(series: any): {
    query: {
        language: "kuery";
        query: any;
    };
    queryString: any;
};
export function ExplorerChartsContainerUI({ id: uuid, isEmbeddable, chartsPerRow, seriesToPlot, severity, tooManyBuckets, kibana, errorMessages, mlLocator, tableData, timeBuckets, timefilter, timeRange, onSelectEntity, tooManyBucketsCalloutMsg, showSelectedInterval, chartsService, showFilterIcons, }: {
    id: any;
    isEmbeddable: any;
    chartsPerRow: any;
    seriesToPlot: any;
    severity: any;
    tooManyBuckets: any;
    kibana: any;
    errorMessages: any;
    mlLocator: any;
    tableData: any;
    timeBuckets: any;
    timefilter: any;
    timeRange: any;
    onSelectEntity: any;
    tooManyBucketsCalloutMsg: any;
    showSelectedInterval: any;
    chartsService: any;
    showFilterIcons?: boolean | undefined;
}): React.JSX.Element;
export const ExplorerChartsContainer: React.FC<Omit<{
    id: any;
    isEmbeddable: any;
    chartsPerRow: any;
    seriesToPlot: any;
    severity: any;
    tooManyBuckets: any;
    kibana: any;
    errorMessages: any;
    mlLocator: any;
    tableData: any;
    timeBuckets: any;
    timefilter: any;
    timeRange: any;
    onSelectEntity: any;
    tooManyBucketsCalloutMsg: any;
    showSelectedInterval: any;
    chartsService: any;
    showFilterIcons?: boolean | undefined;
}, "kibana">>;
import React from 'react';
