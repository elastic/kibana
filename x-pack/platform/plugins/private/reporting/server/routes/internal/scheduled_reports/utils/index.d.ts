import type { KibanaResponseFactory } from '@kbn/core/server';
import type { ReportingCore } from '../../../..';
export declare const validateReportingLicense: ({ reporting, responseFactory, }: {
    reporting: ReportingCore;
    responseFactory: KibanaResponseFactory;
}) => Promise<void>;
