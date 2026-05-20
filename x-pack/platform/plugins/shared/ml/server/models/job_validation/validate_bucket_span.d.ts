export function validateBucketSpan(client: any, job: any, duration: any): Promise<({
    id: string;
    currentBucketSpan?: undefined;
    estimateBucketSpan?: undefined;
    bucketSpan?: undefined;
} | {
    id: string;
    currentBucketSpan: any;
    estimateBucketSpan: any;
    bucketSpan?: undefined;
} | {
    id: string;
    bucketSpan: any;
    currentBucketSpan?: undefined;
    estimateBucketSpan?: undefined;
})[]>;
