import type { TimeState } from '@kbn/es-query';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
export declare function buildDiscoverParams(query: StreamQuery, definition: Streams.all.Definition, timeState: TimeState): {
    timeRange: {
        from: string;
        to: string;
    };
    query: {
        esql: string;
    };
    dataViewSpec: {
        id: string;
        title: string;
        name: string;
        timeFieldName: string;
        type: string;
    };
    filters: never[];
    interval: string;
};
