/**
 * Interface for the Histogram type used by computeChi2PValue.
 */
export interface Histogram {
    /**
     * The doc count.
     */
    doc_count: number;
    /**
     * The key.
     */
    key: string | number;
    /**
     * Optional percentage.
     */
    percentage?: number;
}
