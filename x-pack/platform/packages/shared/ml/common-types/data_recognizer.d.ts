export interface JobStat {
    id: string;
    earliestTimestampMs: number;
    latestTimestampMs: number;
    latestResultsTimestampMs: number | undefined;
}
export interface JobExistResult {
    jobsExist: boolean;
    jobs: JobStat[];
}
