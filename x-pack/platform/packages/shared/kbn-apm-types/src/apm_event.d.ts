export interface ApmEvent {
    legacy?: boolean;
    name: string;
    kuery: string;
    index: string[];
    docCount: number;
    intervals?: Record<string, {
        metricDocCount: number;
        eventDocCount: number;
    }>;
}
