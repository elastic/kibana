export interface LogSource {
    indexPattern: string;
}
export interface LogSourcesService {
    getLogSources: () => Promise<LogSource[]>;
    getFlattenedLogSources: () => Promise<string>;
    setLogSources: (sources: LogSource[]) => Promise<void>;
}
