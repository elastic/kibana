import type { LogsSharedPluginRequestHandlerContext } from '../../../types';
import type { LogEntriesAdapter, LogEntriesParams, LogEntryDocument } from '../../domains/log_entries_domain';
import type { KibanaFramework } from '../framework/kibana_framework_adapter';
import type { ResolvedLogView } from '../../../../common/log_views';
export declare class LogsSharedKibanaLogEntriesAdapter implements LogEntriesAdapter {
    private readonly framework;
    constructor(framework: KibanaFramework);
    getLogEntries(requestContext: LogsSharedPluginRequestHandlerContext, resolvedLogView: ResolvedLogView, fields: string[], params: LogEntriesParams): Promise<{
        documents: LogEntryDocument[];
        hasMoreBefore?: boolean;
        hasMoreAfter?: boolean;
    }>;
}
