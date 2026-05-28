interface GetPartitionMapOpts {
    kibanasPerPartition: number;
    partitions: number[];
    podNames: string[];
}
export declare function getPartitionMap({ kibanasPerPartition, podNames, partitions, }: GetPartitionMapOpts): Record<number, string[]>;
interface AssignPodPartitionsOpts {
    kibanasPerPartition: number;
    podName: string;
    podNames: string[];
    partitions: number[];
}
export declare function assignPodPartitions({ kibanasPerPartition, podName, podNames, partitions, }: AssignPodPartitionsOpts): number[];
export {};
