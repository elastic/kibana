/**
 * Clusters dataset based on [DBSCAN](https://en.wikipedia.org/wiki/DBSCAN).
 * Implementation based on [density-clustering](https://github.com/astrolukasz/density-clustering/blob/master/lib/DBSCAN.js),
 * which is a 10 year old library without any updates since, so reimplemented here.
 */
export declare function dbscan<T>(dataset: T[], epsilon: number, minPts: number, distanceFn: (left: T, right: T) => number): {
    clusters: number[][];
    noise: number[];
};
