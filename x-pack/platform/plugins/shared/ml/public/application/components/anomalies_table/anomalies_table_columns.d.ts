export function getColumns(mlFieldFormatService: any, items: any, jobIds: any, examplesByJobId: any, isAggregatedData: any, interval: any, bounds: any, showViewSeriesLink: any, showRuleEditorFlyout: any, itemIdToExpandedRowMap: any, toggleRow: any, filter: any, influencerFilter: any, sourceIndicesWithGeoFields: any, showAnomalyAlertFlyout: any): ({
    name: React.JSX.Element;
    render: (item: any) => React.JSX.Element;
    field?: undefined;
    'data-test-subj'?: undefined;
    dataType?: undefined;
    scope?: undefined;
    textOnly?: undefined;
    sortable?: undefined;
} | {
    field: string;
    'data-test-subj': string;
    name: string;
    dataType: string;
    scope: string;
    render: (date: any) => string;
    textOnly: boolean;
    sortable: boolean;
} | {
    field: string;
    'data-test-subj': string;
    name: React.JSX.Element;
    render: (score: any, item: any) => React.JSX.Element;
    sortable: boolean;
    dataType?: undefined;
    scope?: undefined;
    textOnly?: undefined;
} | {
    field: string;
    'data-test-subj': string;
    name: string;
    render: (detectorDescription: any, item: any) => React.JSX.Element;
    textOnly: boolean;
    sortable: boolean;
    dataType?: undefined;
    scope?: undefined;
})[];
import React from 'react';
