import type { Logger } from '@kbn/core/server';
import type { ReportingCore } from '../../../core';
export declare const registerDiagnosticRoutes: (reporting: ReportingCore, logger: Logger) => void;
export interface DiagnosticResponse {
    help: string[];
    success: boolean;
    logs: string;
}
