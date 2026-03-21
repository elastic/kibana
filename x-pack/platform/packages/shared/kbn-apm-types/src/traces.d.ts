import type { Span } from './es_schemas/ui/span';
import type { Transaction } from './es_schemas/ui/transaction';
export interface TraceRootSpan {
    duration: number;
}
export interface UnifiedSpanDocument extends Omit<Span, 'transaction'>, Pick<Transaction, 'transaction'> {
    _id: string;
    _index: string;
    duration?: number[] | string;
}
