import type { TransactionRaw } from '../raw/transaction_raw';
import type { Agent } from './fields/agent';
type InnerTransaction = TransactionRaw['transaction'];
interface InnerTransactionWithName extends InnerTransaction {
    name: string;
}
export interface Transaction extends TransactionRaw {
    agent: Agent;
    transaction: InnerTransactionWithName;
}
export {};
