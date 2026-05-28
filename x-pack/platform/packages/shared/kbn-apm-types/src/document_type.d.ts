export declare enum ApmDocumentType {
    TransactionMetric = "transactionMetric",
    ServiceTransactionMetric = "serviceTransactionMetric",
    TransactionEvent = "transactionEvent",
    ServiceDestinationMetric = "serviceDestinationMetric",
    ServiceSummaryMetric = "serviceSummaryMetric",
    ErrorEvent = "error",
    SpanEvent = "span"
}
export type ApmServiceTransactionDocumentType = ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent;
export type ApmTransactionDocumentType = ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent;
