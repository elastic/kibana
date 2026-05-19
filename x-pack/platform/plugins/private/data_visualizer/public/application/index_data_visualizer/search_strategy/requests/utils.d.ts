/** Utility to calculate the correct sample size, whether or not _doc_count is set
 * and calculate the percentage (in fraction) for each bucket
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-doc-count-field.html
 * @param aggResult
 */
export declare const processTopValues: (aggResult: object, sampledCount?: number) => {
    topValuesSampleSize: number;
    topValues: {
        doc_count: number;
        percent: number;
    }[];
};
