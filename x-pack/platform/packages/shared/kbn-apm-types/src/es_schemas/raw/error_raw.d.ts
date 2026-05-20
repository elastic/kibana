import type { APMBaseDoc } from './apm_base_doc';
import type { Container, Host, Http, Kubernetes, Page, Process, Service, Stackframe, TimestampUs, Url, User } from './fields';
import type { Server } from './fields/server';
export interface Processor {
    name: 'error';
    event: 'error';
}
export interface Exception {
    attributes?: {
        response?: string;
    };
    code?: string;
    message?: string;
    type?: string;
    module?: string;
    handled?: boolean;
    stacktrace?: Stackframe[];
}
export interface Log {
    message: string;
    stacktrace?: Stackframe[];
}
export interface ErrorRaw extends APMBaseDoc {
    processor: Processor;
    timestamp: TimestampUs;
    transaction?: {
        id: string;
        sampled?: boolean;
        type: string;
    };
    error: {
        id: string;
        culprit?: string;
        grouping_key: string;
        exception?: Exception[];
        page?: Page;
        log?: Log;
        stack_trace?: string;
        custom?: Record<string, unknown>;
        message?: string;
        code?: string;
        type?: string;
    };
    container?: Container;
    host?: Host;
    http?: Http;
    kubernetes?: Kubernetes;
    process?: Process;
    service: Service;
    url?: Url;
    server?: Server;
    user?: User;
}
