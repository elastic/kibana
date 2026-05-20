export function extractJobDetails(job: any, basePath: any, refreshJobList: any): {
    general?: undefined;
    customUrl?: undefined;
    node?: undefined;
    calendars?: undefined;
    detectors?: undefined;
    influencers?: undefined;
    analysisConfig?: undefined;
    analysisLimits?: undefined;
    dataDescription?: undefined;
    customSettings?: undefined;
    jobTags?: undefined;
    datafeed?: undefined;
    counts?: undefined;
    modelSizeStats?: undefined;
    jobTimingStats?: undefined;
    datafeedTimingStats?: undefined;
    alertRules?: undefined;
} | {
    general: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    customUrl: {
        id: string;
        title: string;
        position: string;
        items: any;
    };
    node: {
        id: string;
        title: string;
        position: string;
        items: never[];
    };
    calendars: {
        id: string;
        title: string;
        position: string;
        items: never[];
    };
    detectors: {
        id: string;
        title: string;
        position: string;
        items: never[];
    };
    influencers: {
        id: string;
        title: string;
        position: string;
        items: any;
    };
    analysisConfig: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    analysisLimits: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    dataDescription: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    customSettings: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    jobTags: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    datafeed: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    counts: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    modelSizeStats: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    jobTimingStats: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    datafeedTimingStats: {
        id: string;
        title: string;
        position: string;
        items: any[][];
    };
    alertRules: {
        id: string;
        title: string;
        position: string;
        items: any;
    };
};
